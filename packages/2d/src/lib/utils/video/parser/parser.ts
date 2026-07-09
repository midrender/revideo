import {createFile} from 'mp4box';
import {FrameSampler} from './sampler';
import {Segment} from './segment';
import {MP4FileSink} from './sink';
import type {Edit} from './utils';
import {description, mp4BoxEditToEdit} from './utils';

/**
 * Loads the file at the given URI until it finds the moov box.
 * Once found, it calls `setConfig` with the video configuration.
 * @param uri - The URI of the video file.
 * @param setConfig - Callback to set the video configuration.
 * @returns
 */
async function getFileInfo(uri: string) {
  return new Promise<{
    file: any;
    edits: Edit[];
    config: VideoDecoderConfig;
  }>((res, rej) => {
    const file = createFile();
    let found = false;
    const controller = new AbortController();

    file.onReady = (info: any) => {
      found = true;
      controller.abort();

      const track = info.videoTracks[0];

      const config = {
        // Browser doesn't support parsing full vp8 codec (eg: `vp08.00.41.08`),
        // they only support `vp8`.
        codec: track.codec.startsWith('vp08') ? 'vp8' : track.codec,
        codedHeight: track.video.height,
        codedWidth: track.video.width,
        description: description(file, track),
      };

      const defaultEdit: Omit<Edit, 'fps'> = {
        mediaTime: 0,
        segmentDuration: track.duration,
        mediaRateInteger: 1,
        mediaRateFraction: 0,
      };

      const editsFromVideo: Omit<Edit, 'fps'>[] = track.edits?.map(
        (edit: any) => mp4BoxEditToEdit(edit),
      );

      // If there are no entries, use the default edit
      const editsWithoutFps = editsFromVideo?.length
        ? editsFromVideo
        : [defaultEdit];

      // Calculate FPS for each segment
      const edits = editsWithoutFps.map(edit => {
        const trackDurationInSec = track.duration / track.timescale;
        const segmentDurationInSec =
          edit.segmentDuration / track.timescale;
        const segmentFrames =
          track.nb_samples * (segmentDurationInSec / trackDurationInSec);
        const mediaRate =
          edit.mediaRateInteger + edit.mediaRateFraction / 0xffff;
        const fps = (segmentFrames / segmentDurationInSec) * mediaRate;
        return {...edit, fps};
      });

      file.setExtractionOptions(track.id);
      file.start();

      res({file, edits, config});
    };

    return fetch(uri, {signal: controller.signal}).then(async response => {
      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const sink = new MP4FileSink(file, () => {});

      while (!found) {
        await reader.read().then(({done, value}) => {
          if (done) {
            file.flush();
            controller.abort();
            rej('Could not find moov');
            return;
          }

          sink.write(value);
        });
      }
    });
  });
}

export class Mp4Parser {
  private uri: string;
  private file: any;
  private edits: Edit[] = [];
  private decoderConfig?: VideoDecoderConfig;

  private startTime: number;
  private targetFps: number;

  private nextSegment = 0;
  private sampler?: FrameSampler;

  public constructor(uri: string, targetFps: number, startTime: number) {
    this.uri = uri;
    this.targetFps = targetFps;
    this.startTime = startTime;
  }

  public async start() {
    const {file, edits, config} = await getFileInfo(this.uri);
    this.file = file;
    this.edits = edits;
    this.decoderConfig = config;
  }

  public async getNextFrame() {
    // Start the first segment
    if (!this.sampler) {
      // Skip segments until the start time
      let startTimeWithinSegment = this.startTime;
      while (this.nextSegment < this.edits.length) {
        const segmentDurationInSeconds = this.getSecondDurationOfSegment(
          this.edits[this.nextSegment],
        );
        if (startTimeWithinSegment < segmentDurationInSeconds) {
          break;
        }

        startTimeWithinSegment -= segmentDurationInSeconds;
        this.nextSegment++;
      }

      // The timestamp is outside of the video
      if (this.nextSegment >= this.edits.length) {
        throw new Error(
          `Timestamp ${this.startTime} is outside of the video, max timestamp is ${this.getDuration()}`,
        );
      }

      const segment = new Segment(
        this.uri,
        this.file,
        this.edits,
        this.nextSegment,
        startTimeWithinSegment,
      );
      await segment.start(this.decoderConfig!);

      this.sampler = new FrameSampler(
        segment,
        this.edits[this.nextSegment].fps,
        this.targetFps,
        0,
      );
      this.nextSegment++;
    }

    // Try to get the next frame
    let frame = await this.sampler.getNextFrame();

    // If there are no more frames in the current segment, start the next segment
    while (!frame && this.nextSegment < this.edits.length) {
      this.sampler.getSegment().close();
      this.sampler.getLastFrame()?.close();
      const segment = new Segment(
        this.uri,
        this.file,
        this.edits,
        this.nextSegment,
        0,
      );
      await segment.start(this.decoderConfig!);

      this.sampler = new FrameSampler(
        segment,
        this.edits[this.nextSegment].fps,
        this.targetFps,
        this.sampler.getSum(), // Carry over the sum from the previous segment
      );
      this.nextSegment++;

      frame = await this.sampler.getNextFrame();
    }

    // If there are no more frames, return the last frame
    if (!frame) {
      frame = this.sampler.getLastFrame();

      // We can close the segment
      await this.sampler.getSegment().close();

      // If we still don't have a frame, throw an error
      if (!frame) {
        throw new Error('There are no frames in the video.');
      }
    }

    return frame;
  }

  private getSecondDurationOfSegment(edit: Edit) {
    const mediaRate = edit.mediaRateInteger + edit.mediaRateFraction / 0xffff;
    const duration =
      edit.segmentDuration / this.file.getInfo().videoTracks[0].timescale;
    return duration / mediaRate;
  }

  public getDuration() {
    return this.edits.reduce(
      (acc, edit) => acc + this.getSecondDurationOfSegment(edit),
      0,
    );
  }

  private getTimeSubtractingFrames(frames: number) {
    const durationOfPastSegmentsInSeconds = this.edits
      .slice(0, this.nextSegment - 1)
      .reduce((acc, edit) => acc + this.getSecondDurationOfSegment(edit), 0);

    if (!this.sampler) {
      throw new Error('No current segment');
    }

    const currentSegmentStartTime = this.sampler.getSegment().getStartTime();
    const samplerTime = this.sampler.getTime(frames);

    return (
      durationOfPastSegmentsInSeconds + currentSegmentStartTime + samplerTime
    );
  }

  public getTime() {
    return this.getTimeSubtractingFrames(0);
  }

  public getLastTime() {
    return this.getTimeSubtractingFrames(1);
  }

  public getLastFrame() {
    return this.sampler?.getLastFrame();
  }

  public close() {
    this.sampler?.getSegment().close();
    this.sampler?.getLastFrame()?.close();
    this.file.flush();
  }
}
