import type {
  FfmpegExporterOptions,
  RendererResult,
  RendererSettings,
} from '@revideo/core';
import {EventName, sendEvent} from '@revideo/telemetry';
import * as ffmpeg from 'fluent-ffmpeg';
import * as os from 'os';
import * as path from 'path';
import {ImageStream} from './image-stream';
import {ffmpegSettings} from './settings';

export interface FFmpegExporterSettings extends RendererSettings {
  fastStart: boolean;
  includeAudio: boolean;
  output: string;
}

const pixelFormats: Record<FfmpegExporterOptions['format'], string> = {
  mp4: 'yuv420p',
  webm: 'yuva420p',
  proRes: 'yuva444p10le',
};

export const extensions: Record<FfmpegExporterOptions['format'], string> = {
  mp4: 'mp4',
  webm: 'webm',
  proRes: 'mov',
};

/**
 * The server-side implementation of the FFmpeg video exporter.
 */
export class FFmpegExporterServer {
  private readonly stream: ImageStream;
  private readonly command: ffmpeg.FfmpegCommand;
  private readonly promise: Promise<void>;
  private readonly settings: FFmpegExporterSettings;
  private readonly jobFolder: string;
  private readonly format: FfmpegExporterOptions['format'];

  public constructor(settings: FFmpegExporterSettings) {
    if (settings.exporter.name !== '@revideo/core/ffmpeg') {
      throw new Error('Invalid exporter');
    }

    this.settings = settings;
    this.format = settings.exporter.options.format;

    this.jobFolder = path.join(
      os.tmpdir(),
      `revideo-${this.settings.name}-${settings.hiddenFolderId}`,
    );
    this.stream = new ImageStream();

    ffmpeg.setFfmpegPath(ffmpegSettings.getFfmpegPath());
    this.command = ffmpeg();

    // Input image sequence
    this.command
      .input(this.stream)
      .inputFormat('image2pipe')
      .inputFps(settings.fps);

    // Output settings
    const size = {
      x: Math.round(settings.size.x * settings.resolutionScale),
      y: Math.round(settings.size.y * settings.resolutionScale),
    };
    this.command
      .output(path.join(this.jobFolder, `visuals.${extensions[this.format]}`))
      .outputOptions([`-pix_fmt ${pixelFormats[this.format]}`, '-shortest'])
      .outputFps(settings.fps)
      .size(`${size.x}x${size.y}`);

    if (this.format === 'proRes') {
      this.command.outputOptions(['-c:v prores_ks', '-profile:v 4444']);
    }

    this.command.outputOptions(['-movflags +faststart']);
    this.promise = new Promise<void>((resolve, reject) => {
      this.command.on('end', () => resolve()).on('error', reject);
    });
  }

  public async start() {
    this.command.run();
  }

  public async handleFrame({data}: {data: string}) {
    const base64Data = data.slice(data.indexOf(',') + 1);
    this.stream.pushImage(Buffer.from(base64Data, 'base64'));
  }

  public async end(result: RendererResult) {
    this.stream.pushImage(null);
    if (result === 1) {
      try {
        this.command.kill('SIGKILL');
        await this.promise;
      } catch (err) {
        sendEvent(EventName.Error, {message: (err as Error).message});
      }
    } else {
      await this.promise;
    }
  }

  public async kill() {
    try {
      this.command.kill('SIGKILL');
      await this.promise;
    } catch (_) {
      return;
    }
  }
}
