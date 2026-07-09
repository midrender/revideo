import {MP4FileSink} from './sink';
import type {Edit} from './utils';

const MAX_DECODE_QUEUE_SIZE = 30;

export class Segment {
  private done: boolean = false;
  private currentFramePastSegmentEndTime: boolean = false;
  private abortController = new AbortController();
  private uri: string;

  private file: any;
  private edit: Edit;

  private responseFinished: boolean = false;
  private decoder: VideoDecoder;

  private framesProcessed = 0;
  private startTime: number;
  private framesDue = 0;
  private frameBuffer: VideoFrame[] = [];
  private encodedChunkQueue: EncodedVideoChunk[] = [];

  private readMore: () => Promise<void> = async () => {};

  public constructor(
    uri: string,
    file: any,
    edits: Edit[],
    currentSegment: number,
    startTime: number = 0,
  ) {
    this.uri = uri;

    this.file = file;
    this.file.onSamples = this.onSamples.bind(this);
    this.edit = edits[currentSegment];

    this.startTime = startTime;

    // Check how many frames we skipped because of the startTime and add them to the frames processed.
    const framesSkipped = Math.floor(this.startTime * this.edit.fps);
    this.framesProcessed += framesSkipped;

    this.decoder = new VideoDecoder({
      output: this.onFrame.bind(this),
      error(e) {
        console.error(e);
      },
    });
  }

  public async start(decoderConfig: VideoDecoderConfig) {
    // If this is an empty edit, we just need to fill the buffer with empty frames.
    if (this.edit.mediaTime === -1) {
      this.done = true;
      this.responseFinished = true;
      this.decoder.close();

      const segmentDurationInSeconds =
        this.edit.segmentDuration /
        this.file.getInfo().videoTracks[0].timescale;
      const framesToFill = Math.ceil(segmentDurationInSeconds * this.edit.fps);

      const height = this.file.getInfo().videoTracks[0].track_height;
      const width = this.file.getInfo().videoTracks[0].track_width;

      const bufferSize = height * width * 4;
      const buffer = new ArrayBuffer(bufferSize);
      const uint8Array = new Uint8Array(buffer);

      // Make the frame black
      uint8Array.fill(0);

      this.frameBuffer = Array.from({length: framesToFill}, () => {
        return new VideoFrame(uint8Array, {
          timestamp: 0,
          duration: 1 / this.edit.fps,
          codedHeight: height,
          codedWidth: width,
          format: 'BGRA',
        });
      });

      return;
    }

    this.decoder.configure(decoderConfig);
    const videoTrack = this.file.getInfo().videoTracks[0];
    const trak = this.file.getTrackById(videoTrack.id);

    const mediaTimeInTimescale = this.edit.mediaTime;
    const startTimeInTimescale = this.startTime * videoTrack.timescale;
    const seekTimeInTimescale = mediaTimeInTimescale + startTimeInTimescale;

    const seekTimeInSec = seekTimeInTimescale / videoTrack.timescale;
    const seekInfo = this.file.seekTrack(seekTimeInSec, true, trak);
    this.readMore = await this.startStreamingAtOffset(
      this.file,
      this.uri,
      seekInfo.offset,
    );
  }

  /**
   * Starts streaming the video at the given URI from the given offset.
   * @param file - MP4Box file. Needs to be created and configured before calling this function.
   * @param uri - URI of the video file.
   * @param offset - Offset to start streaming from.
   * @returns - A function to read more data from the response.
   */
  private async startStreamingAtOffset(file: any, uri: string, offset: number) {
    return fetch(uri, {
      headers: {
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        Range: `bytes=${offset}-`,
      },
      signal: this.abortController.signal,
    }).then(async response => {
      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const sink = new MP4FileSink(file, () => {}, offset);

      return async () => {
        return reader.read().then(({done, value}) => {
          // Request is done.
          if (done) {
            this.responseFinished = true;
            this.abortController.abort();
            sink.close();
            return;
          }

          sink.write(value);
        });
      };
    });
  }

  /**
   * Called when samples are available on the MP4 file.
   * Sends chunks to the decoder.
   */
  private onSamples(_unused1: any, _unused2: any, samples: any) {
    for (const sample of samples) {
      const chunk = new EncodedVideoChunk({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp: (1e6 * sample.cts) / sample.timescale,
        duration: (1e6 * sample.duration) / sample.timescale,
        data: sample.data,
      });
      this.framesDue++;
      this.encodedChunkQueue.push(chunk);

      const videoTrack = this.file.getInfo().videoTracks[0];
      const trak = this.file.getTrackById(videoTrack.id);
      this.file.releaseSample(trak, sample.number);
    }
  }

  private async decodeChunks() {
    while (
      this.encodedChunkQueue.length > 0 &&
      this.decoder.decodeQueueSize < MAX_DECODE_QUEUE_SIZE
    ) {
      const chunk = this.encodedChunkQueue.shift();
      if (chunk) {
        this.decoder.decode(chunk);
      }
    }
    // When edit is empty, we cannot call decoder.flush() because decoder was already closed
    if (this.done) {
      this.currentFramePastSegmentEndTime = true;
      return;
    }
    if (this.responseFinished && this.encodedChunkQueue.length === 0) {
      await this.flushDecoderWithRetry();
      this.currentFramePastSegmentEndTime = true;
      return;
    }
  }

  private async flushDecoderWithRetry(maxRetries = 3, timeoutMs = 2000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Sometimes decoder.flush does not resolve even though the queue size is zero
      if (this.decoder.decodeQueueSize === 0) {
        return;
      }
      try {
        await Promise.race([
          this.decoder.flush(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Flush timeout')), timeoutMs),
          ),
        ]);
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
  }

  /**
   * Called when the decoder has a frame ready.
   * Pushes the frame to the buffer so it can be consumed.
   */
  private async onFrame(frame: VideoFrame) {
    this.framesDue--;

    // If the frame comes before the seek time, close it.
    const mediaTimeInSec =
      this.edit.mediaTime / this.file.getInfo().videoTracks[0].timescale;
    const seekTimeInSec = this.startTime + mediaTimeInSec;
    const frameTimeInSec = frame.timestamp / 1e6;
    if (frameTimeInSec < seekTimeInSec) {
      frame.close();
      return;
    }

    // Check if we are past the segment duration.
    const segmentDurationInSec =
      this.edit.segmentDuration /
      this.file.getInfo().videoTracks[0].timescale;
    const segmentEndTime = mediaTimeInSec + segmentDurationInSec;
    if (frameTimeInSec > segmentEndTime) {
      frame.close();
      this.done = true;
      await this.decoder.flush();
      return;
    }

    this.frameBuffer.push(frame);
  }

  private async populateBuffer() {
    // Fetch more frames if we don't have any.
    while (
      this.frameBuffer.length === 0 &&
      !this.currentFramePastSegmentEndTime
    ) {
      if (!this.responseFinished) {
        await this.readMore();
      }
      await this.decodeChunks();
      await new Promise(res => setTimeout(res, 0));
    }

    // Wait for decoder if there are frames due.
    if (this.frameBuffer.length === 0 && this.framesDue > 0) {
      let maxIterations = 200;
      while (this.frameBuffer.length === 0) {
        await new Promise(res => setTimeout(res, 10));
        maxIterations--;

        if (this.done) {
          return;
        }

        if (maxIterations === 0) {
          return; // TODO: investigate further, shouldn't this be an error?
        }
      }
    }
  }

  public async getNextFrame() {
    await this.populateBuffer();
    const frame = this.frameBuffer.shift();
    if (frame) {
      this.framesProcessed++;
    }
    return frame;
  }

  /**
   * Called when we are done with the extractor.
   */
  public async close() {
    this.abortController.abort();
    this.frameBuffer.forEach(frame => frame.close());
    try {
      if (this.decoder.state === 'configured') {
        await this.decoder.flush();
        this.decoder.close();
      }
    } catch (e) {
      // Ignore
    }
  }

  public getFramesProcessed() {
    return this.framesProcessed;
  }

  public getStartTime() {
    return this.startTime;
  }
}
