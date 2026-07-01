import {EventName, sendEvent} from '@revideo/telemetry';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {v4 as uuidv4} from 'uuid';
import {ffmpegSettings} from './settings';
import {getVideoMetadata} from './utils';

type VideoFrameExtractorState = 'processing' | 'done' | 'error';

/**
 * Walks through a video file and extracts frames.
 */
export class VideoFrameExtractor {
  private static readonly chunkLengthInSeconds = 5;

  private readonly ffmpegPath = ffmpegSettings.getFfmpegPath();

  public state: VideoFrameExtractorState;
  public filePath: string;
  private downloadedFilePath: string;

  private buffer: Buffer = Buffer.alloc(0);
  private bufferOffset: number = 0;

  // Images are buffered in memory until they are requested.
  private imageBuffers: Buffer[] = [];
  private lastImage: Buffer | null = null;

  private startTime: number;
  private startTimeOffset: number;
  private duration: number;
  private toTime: number;
  private fps: number;
  private framesProcessed: number = 0;

  private width: number = 0;
  private height: number = 0;
  private frameSize: number = 0;
  private codec: string | null = null;
  private process: ffmpeg.FfmpegCommand | null = null;
  private terminated: boolean = false;

  public static downloadedVideoMap: Map<
    string,
    {localPath: string; startTimeOffset: number}
  > = new Map();

  public constructor(
    filePath: string,
    startTime: number,
    fps: number,
    duration: number,
  ) {
    this.state = 'processing';
    this.filePath = filePath;
    this.downloadedFilePath = VideoFrameExtractor.downloadedVideoMap.get(
      filePath,
    )?.localPath as string;
    this.startTimeOffset = VideoFrameExtractor.downloadedVideoMap.get(filePath)
      ?.startTimeOffset as number;

    this.startTime = startTime;
    this.duration = duration;
    this.toTime = this.getEndTime(this.startTime);
    this.fps = fps;

    getVideoMetadata(this.downloadedFilePath).then(metadata => {
      this.width = metadata.width;
      this.height = metadata.height;
      this.frameSize = this.width * this.height * 4;
      this.buffer = Buffer.alloc(this.frameSize);
      this.codec = metadata.codec;

      if (this.startTime >= this.duration) {
        this.process = this.createFfmpegProcessToExtractFirstFrame(
          this.downloadedFilePath,
          this.codec,
        );
        return;
      }

      this.process = this.createFfmpegProcess(
        this.startTime - this.startTimeOffset,
        this.toTime,
        this.downloadedFilePath,
        this.fps,
        this.codec,
      );
    });
  }

  public static downloadVideoChunk(
    url: string,
    startTime: number,
    endTime: number,
  ) {
    const outputDir = path.join(os.tmpdir(), `revideo-decoder-chunks`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, {recursive: true});
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(url, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const format = metadata.format.format_name?.split(',')[-1] || 'mp4';
        const outputFileName = `chunk_${uuidv4()}.${format}`;
        const outputPath = path.join(outputDir, outputFileName);
        const toleranceInSeconds = 0.5;

        const adjustedStartTime = Math.max(startTime - toleranceInSeconds, 0);

        ffmpeg(url)
          .setFfmpegPath(ffmpegSettings.getFfmpegPath())
          .inputOptions([
            `-ss ${adjustedStartTime}`,
            `-to ${endTime + toleranceInSeconds}`,
          ])
          .outputOptions(['-c copy'])
          .output(outputPath)
          .on('end', () => {
            this.downloadedVideoMap.set(url, {
              localPath: outputPath,
              startTimeOffset: adjustedStartTime,
            });
            resolve(outputPath);
          })
          .on('error', err => reject(err))
          .run();
      });
    });
  }

  public getTime() {
    return this.startTime + this.framesProcessed / this.fps;
  }

  public getLastTime() {
    return this.startTime + (this.framesProcessed - 1) / this.fps;
  }

  public getLastFrame() {
    return this.lastImage;
  }

  public getWidth() {
    return this.width;
  }

  public getHeight() {
    return this.height;
  }

  private getEndTime(startTime: number) {
    return Math.min(
      startTime + VideoFrameExtractor.chunkLengthInSeconds,
      this.duration,
    );
  }

  private getArgs(
    codec: string,
    range?: [number, number],
    fps?: number,
  ): {inputOptions: string[]; outputOptions: string[]} {
    const inputOptions = [];
    const outputOptions = [];

    inputOptions.push('-loglevel', ffmpegSettings.getLogLevel());

    if (range) {
      inputOptions.push(
        ...['-ss', range[0].toFixed(2), '-to', range[1].toFixed(2)],
      );
    }

    if (codec === 'vp9') {
      inputOptions.push('-vcodec', 'libvpx-vp9');
    }

    if (fps) {
      outputOptions.push('-vf', `fps=fps=${fps}`);
    }

    if (!range) {
      outputOptions.push('-vframes', '1');
    }

    outputOptions.push('-f', 'rawvideo');
    outputOptions.push('-pix_fmt', 'rgba');

    return {inputOptions, outputOptions};
  }

  private createFfmpegProcess(
    startTime: number,
    toTime: number,
    filePath: string,
    fps: number,
    codec: string,
  ): ffmpeg.FfmpegCommand {
    const {inputOptions, outputOptions} = this.getArgs(
      codec,
      [startTime, toTime],
      fps,
    );

    const process = ffmpeg(filePath)
      .setFfmpegPath(this.ffmpegPath)
      .inputOptions(inputOptions)
      .outputOptions(outputOptions)
      .on('end', () => {
        this.handleClose(0);
      })
      .on('error', err => {
        this.handleError(err);
      })
      .on('stderr', stderrLine => {
        console.log(stderrLine);
      });

    const ffstream = process.pipe();
    ffstream.on('data', (data: Buffer) => {
      this.processData(data);
    });

    return process;
  }

  /**
   * We call this in the case that the time requested is greater than the
   * duration of the video. In this case, we want to display the first frame
   * of the video.
   *
   * Note: This does NOT match the behavior of the old implementation
   * inside of 2d/src/lib/components/Video.ts. In the old implementation, the
   * last frame is shown instead of the first frame.
   */
  private createFfmpegProcessToExtractFirstFrame(
    filePath: string,
    codec: string,
  ): ffmpeg.FfmpegCommand {
    const {inputOptions, outputOptions} = this.getArgs(
      codec,
      undefined,
      undefined,
    );

    const process = ffmpeg(filePath)
      .setFfmpegPath(this.ffmpegPath)
      .inputOptions(inputOptions)
      .outputOptions(outputOptions)
      .on('end', () => {
        this.handleClose(0);
      })
      .on('error', err => {
        this.handleError(err);
      })
      .on('stderr', stderrLine => {
        console.log(stderrLine);
      });

    const ffstream = process.pipe();
    ffstream.on('data', (data: Buffer) => {
      this.processData(data);
    });

    return process;
  }

  private processData(data: Buffer) {
    let dataOffset = 0;

    while (dataOffset < data.length) {
      const remainingSpace = this.frameSize - this.bufferOffset;
      const chunkSize = Math.min(remainingSpace, data.length - dataOffset);

      data.copy(
        this.buffer,
        this.bufferOffset,
        dataOffset,
        dataOffset + chunkSize,
      );
      this.bufferOffset += chunkSize;
      dataOffset += chunkSize;

      // We have a complete frame
      if (this.bufferOffset === this.frameSize) {
        this.imageBuffers.push(Buffer.from(this.buffer)); // Create a copy
        this.bufferOffset = 0; // Reset buffer for next frame
      }
    }
  }

  public async popImage() {
    if (this.imageBuffers.length) {
      const image = this.imageBuffers.shift()!;
      this.framesProcessed++;
      this.lastImage = image;
      return image;
    }

    if (this.state === 'error') {
      throw new Error('An error occurred while extracting the video frames.');
    }

    // If the video is done and there are no more frames to extract, return the last frame.
    if (this.state === 'done' && this.toTime >= this.duration) {
      return this.lastImage;
    }

    // If there are more frames to extract, request the next chunk.
    if (this.state === 'done') {
      this.startTime = this.toTime;
      this.toTime = Math.min(
        this.startTime + VideoFrameExtractor.chunkLengthInSeconds,
        this.duration,
      );

      if (!this.codec) {
        throw new Error(
          "Can't extract frames without a codec. This error should never happen.",
        );
      }

      this.process = this.createFfmpegProcess(
        this.startTime,
        this.toTime,
        this.downloadedFilePath,
        this.fps,
        this.codec,
      );

      this.state = 'processing';
    }

    while (this.imageBuffers.length < 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const image = this.imageBuffers.shift()!;
    this.framesProcessed++;
    this.lastImage = image;
    return image;
  }

  private handleClose(code: number) {
    this.state = code === 0 ? 'done' : 'error';
  }

  private async handleError(err: any) {
    const code = err.code;

    if (this.terminated) {
      return;
    }

    if (code === 'ENOENT') {
      sendEvent(EventName.Error, {error: 'ffmpeg-not-found'});
      throw new Error(
        'Error: ffmpeg not found. Make sure ffmpeg is installed on your system.',
      );
    } else if (err.message.includes('SIGSEGV')) {
      sendEvent(EventName.Error, {
        error: 'ffmpeg-sigsegv',
        message: err.message,
      });
      throw new Error(
        `Error: Segmentation fault when running ffmpeg. This is a common issue on Linux, you might be able to fix it by installing nscd ('sudo apt-get install nscd'). For more information, see https://docs.re.video/common-issues/ffmpeg/`,
      );
    } else {
      await sendEvent(EventName.Error, {
        error: 'ffmpeg-error',
        message: err.message,
      });
      throw new Error(
        `An ffmpeg error occurred while fetching frames from source video ${this.filePath}: ${err}`,
      );
    }
  }

  public destroy() {
    this.terminated = true;
    this.process?.kill('SIGTERM');
  }
}
