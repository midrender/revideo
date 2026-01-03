import {EventDispatcher, ValueDispatcher} from '../events';
import type {ExporterClass} from '../exporter';
import {
  FFmpegExporterClient,
  ImageExporter,
  WasmExporter,
  type Exporter,
} from '../exporter';
import type {Scene} from '../scenes';
import {clampRemap} from '../tweening';
import {
  calculateSubframeOffsets,
  calculateSubframeWeights,
  Vector2,
} from '../types';
import {Semaphore} from '../utils';
import {PlaybackManager, PlaybackState} from './PlaybackManager';
import {PlaybackStatus} from './PlaybackStatus';
import type {ExporterSettings, Project} from './Project';
import {SharedWebGLContext} from './SharedWebGLContext';
import type {StageSettings} from './Stage';
import {Stage} from './Stage';
import {TimeEstimator} from './TimeEstimator';

export interface RendererSettings extends StageSettings {
  name: string;
  range: [number, number];
  fps: number;
  exporter: ExporterSettings;
  hiddenFolderId?: string;
}

export interface AssetInfo {
  key: string;
  type: 'video' | 'audio';
  src: string;
  playbackRate: number;
  volume: number;
  currentTime: number;
  duration: number;
  decoder?: string | null;
}

export enum RendererState {
  Initial,
  Working,
  Aborting,
}

export enum RendererResult {
  Success,
  Error,
  Aborted,
}

/**
 * The rendering logic used by the editor to export animations.
 *
 * @remarks
 * This class uses the `PlaybackManager` to render animations. In contrast to a
 * player, a renderer does not use an update loop. It plays through the
 * animation as fast as it can, occasionally pausing to keep the UI responsive.
 *
 * The actual exporting is outsourced to an Exporter.
 */
export class Renderer {
  public get onStateChanged() {
    return this.state.subscribable;
  }
  private readonly state = new ValueDispatcher(RendererState.Initial);

  public get onFinished() {
    return this.finished.subscribable;
  }
  private readonly finished = new EventDispatcher<RendererResult>();

  public get onFrameChanged() {
    return this.frame.subscribable;
  }
  private readonly frame = new ValueDispatcher(0);

  public readonly stage = new Stage();
  public readonly estimator = new TimeEstimator();

  private readonly lock = new Semaphore();
  private readonly playback: PlaybackManager;
  private readonly status: PlaybackStatus;
  private readonly sharedWebGLContext: SharedWebGLContext;
  private exporter: Exporter | null = null;
  private abortController: AbortController | null = null;

  public constructor(private project: Project) {
    this.playback = new PlaybackManager();
    this.status = new PlaybackStatus(this.playback);
    this.sharedWebGLContext = new SharedWebGLContext(this.project.logger);
    const scenes: Scene[] = [];

    for (const description of project.scenes) {
      const scene = new description.klass({
        ...description,
        playback: this.status,
        logger: this.project.logger,
        size: new Vector2(1920, 1080),
        resolutionScale: 1,
        sharedWebGLContext: this.sharedWebGLContext,
        experimentalFeatures: project.experimentalFeatures,
      });
      scenes.push(scene);
    }
    this.playback.setup(scenes);
  }

  /**
   * Returns number of frames that a project will have.
   */
  public async getNumberOfFrames(settings: RendererSettings) {
    await this.lock.acquire();
    this.estimator.reset();
    this.state.current = RendererState.Working;

    await this.reloadScenes(settings);
    await this.playback.recalculate();
    await this.playback.reset();

    const frames = this.playback.duration;

    this.state.current = RendererState.Initial;
    this.sharedWebGLContext.dispose();
    this.lock.release();

    return frames;
  }

  public frameToTime(frame: number) {
    return this.status.framesToSeconds(frame);
  }

  public timeToFrame(second: number) {
    return this.status.secondsToFrames(second);
  }

  /**
   * Render the animation using the provided settings.
   *
   * @param settings - The rendering settings.
   */
  public async render(settings: RendererSettings) {
    if (this.state.current !== RendererState.Initial) return;
    await this.lock.acquire();
    this.estimator.reset();
    this.state.current = RendererState.Working;
    let result: RendererResult;
    try {
      this.abortController = new AbortController();
      result = await this.run(settings, this.abortController.signal);
    } catch (e: any) {
      this.project.logger.error(e);
      result = RendererResult.Error;
      if (this.exporter) {
        try {
          await this.exporter.stop?.(result);
        } catch (_) {
          throw Error(e.message);
        }
        this.exporter = null;
        throw Error(e.message);
      }
    }

    this.estimator.update(1);
    this.state.current = RendererState.Initial;
    this.finished.dispatch(result);
    this.sharedWebGLContext.dispose();
    this.lock.release();
  }

  /**
   * Abort the ongoing render process.
   */
  public abort() {
    if (this.state.current !== RendererState.Working) return;
    this.abortController?.abort();
    this.state.current = RendererState.Aborting;
  }

  /**
   * Export an individual frame.
   *
   * @remarks
   * This method always uses the default `ImageExporter`.
   *
   * @param settings - The rendering settings.
   * @param time - The timestamp to export.
   */
  public async renderFrame(settings: RendererSettings, time: number) {
    await this.lock.acquire();

    try {
      const frame = this.status.secondsToFrames(time);
      this.stage.configure(settings);
      this.playback.fps = settings.fps;
      this.playback.state = PlaybackState.Rendering;

      await this.reloadScenes(settings);
      await this.playback.reset();
      await this.playback.seek(frame);
      await this.stage.render(
        this.playback.currentScene!,
        this.playback.previousScene,
      );

      if (import.meta.hot) {
        import.meta.hot.send('revideo:export', {
          frame,
          data: this.stage.finalBuffer.toDataURL('image/png'),
          mimeType: 'image/png',
          subDirectories: ['still', this.project.name],
        });
      }
    } catch (e: any) {
      this.project.logger.error(e);
    }

    this.lock.release();
  }

  private async run(
    settings: RendererSettings,
    signal: AbortSignal,
  ): Promise<RendererResult> {
    // Select exporter
    // TODO(refactor): check if i want to keep it this way
    const exporters: ExporterClass[] = [
      FFmpegExporterClient,
      ImageExporter,
      WasmExporter,
    ];

    const exporterClass = exporters.find(
      exporter => exporter.id === settings.exporter.name,
    );

    if (!exporterClass) {
      this.project.logger.error(
        `Could not find the "${settings.exporter.name}" exporter.`,
      );
      return RendererResult.Error;
    }

    // Instantiate exporter
    this.exporter = await exporterClass.create(this.project, settings);
    if (this.exporter.configuration) {
      settings = {
        ...settings,
        ...((await this.exporter.configuration()) ?? {}),
      };
    }
    this.stage.configure(settings);
    this.playback.fps = settings.fps;
    this.playback.state = PlaybackState.Rendering;
    const from = this.status.secondsToFrames(settings.range[0]);
    this.frame.current = from;

    // Reset
    await this.reloadScenes(settings);
    await this.playback.recalculate();
    await this.playback.reset();

    const to = Math.min(
      this.playback.duration,
      this.status.secondsToFrames(settings.range[1]),
    );
    await this.playback.seek(from);
    if (signal.aborted) return RendererResult.Aborted;

    await this.exporter.start?.();
    let lastRefresh = performance.now();
    let result = RendererResult.Success;

    const mediaByFrames = await this.getMediaByFrames(settings);

    // Start audio export
    let generateAudioPromise;
    if (this.exporter && this.exporter.generateAudio) {
      generateAudioPromise = this.exporter.generateAudio(
        mediaByFrames,
        from,
        to,
      );
    }

    if (this.exporter && this.exporter.downloadVideos) {
      await this.exporter.downloadVideos(mediaByFrames);
    }

    // Main rendering loop
    await this.playback.seek(from);

    // Calculate motion blur frame advancement to compensate in main loop
    const motionBlurConfig = this.stage.getMotionBlurConfig();
    let motionBlurAdvancement = 0;
    if (motionBlurConfig.enabled) {
      const shutterFraction = motionBlurConfig.shutterAngle / 360;
      const subframeStep = shutterFraction / motionBlurConfig.samples;
      // Motion blur advances (samples - 1) times
      motionBlurAdvancement = (motionBlurConfig.samples - 1) * subframeStep;
    }
    // Speed needed after motion blur to reach next integer frame
    const compensatedSpeed = 1 - motionBlurAdvancement;

    try {
      this.estimator.reset(1 / (to - from));
      await this.exportFrame(signal);
      this.estimator.update(clampRemap(from, to, 0, 1, this.playback.frame));
      this.estimator.reportProgress();

      if (signal.aborted) {
        result = RendererResult.Aborted;
      } else {
        let finished = false;
        while (!finished) {
          // Advance to next frame, compensating for motion blur's advancement
          this.playback.speed = motionBlurConfig.enabled ? compensatedSpeed : 1;
          await this.playback.progress();
          this.playback.speed = 1; // Reset for motion blur's internal use

          await this.exportFrame(signal);
          this.estimator.update(
            clampRemap(from, to, 0, 1, this.playback.frame),
          );
          this.estimator.reportProgress();
          if (performance.now() - lastRefresh > 1 / 30) {
            lastRefresh = performance.now();
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          if (this.playback.finished || this.playback.frame >= to) {
            finished = true;
          }
          if (signal.aborted) {
            result = RendererResult.Aborted;
            finished = true;
          }
        }
      }
    } catch (e: any) {
      this.project.logger.error(e);
      result = RendererResult.Error;
    }

    await this.exporter.stop?.(result);

    // Only merge media when rendering images was actually successful.
    if (
      result === RendererResult.Success &&
      this.exporter &&
      this.exporter.mergeMedia &&
      generateAudioPromise
    ) {
      try {
        await generateAudioPromise;
        await this.exporter.mergeMedia();
      } catch (e: any) {
        this.project.logger.error(e);
        result = RendererResult.Error;
      }
    }

    await this.exporter?.kill?.();
    this.exporter = null;

    return result;
  }

  private async reloadScenes(settings: RendererSettings) {
    for (let i = 0; i < this.project.scenes.length; i++) {
      const scene = this.playback.onScenesRecalculated.current[i];
      scene.reload({
        size: settings.size,
        resolutionScale: settings.resolutionScale,
      });
      scene.variables.updateSignals(this.project.variables ?? {});
    }
  }

  private async exportFrame(signal: AbortSignal) {
    this.frame.current = this.playback.frame;

    const motionBlurConfig = this.stage.getMotionBlurConfig();

    // Debug: log motion blur config on first frame
    if (this.playback.frame === 0) {
      console.log('[Motion Blur Debug] Config:', JSON.stringify(motionBlurConfig));
    }

    if (motionBlurConfig.enabled) {
      // Render with motion blur using subframe accumulation
      if (this.playback.frame === 0) {
        console.log('[Motion Blur Debug] Using motion blur rendering path');
      }
      await this.exportFrameWithMotionBlur(signal, motionBlurConfig);
    } else {
      // Standard single-frame rendering
      await this.stage.render(
        this.playback.currentScene!,
        this.playback.previousScene,
      );
    }

    const sceneFrame =
      this.playback.frame - this.playback.currentScene.firstFrame;

    await this.exporter!.handleFrame(
      this.stage.finalBuffer,
      this.playback.frame,
      sceneFrame,
      this.playback.currentScene.name,
      signal,
    );
  }

  /**
   * Export a frame with motion blur by rendering sub-frames and blending.
   *
   * Motion Canvas uses generator-based animations that evaluate during progress(),
   * not during render. So we must actually advance the scene through each subframe
   * to get proper motion blur.
   *
   * Strategy:
   * 1. Save current frame position
   * 2. Advance through subframe positions using progress() with small speed
   * 3. Render and accumulate each subframe
   * 4. Frame will naturally be at the right position for next iteration
   */
  private async exportFrameWithMotionBlur(
    signal: AbortSignal,
    config: ReturnType<typeof this.stage.getMotionBlurConfig>,
  ) {
    const samples = config.samples;

    // Calculate weights based on shutter curve (box/triangle/gaussian)
    const weights = calculateSubframeWeights(config);

    // Calculate shutter window in frames
    // shutterAngle 360° = 1 full frame, 180° = 0.5 frames
    const shutterFraction = config.shutterAngle / 360;
    const subframeStep = shutterFraction / samples;

    // Begin accumulation
    this.stage.beginMotionBlurAccumulation();

    // Debug: log on first frame
    if (this.playback.frame === 0) {
      console.log(
        `[Motion Blur] samples=${samples}, shutterAngle=${config.shutterAngle}°, curve=${config.shutterCurve}, position=${config.shutterPosition}`,
      );
      console.log(`[Motion Blur] Subframe step: ${subframeStep.toFixed(4)} frames, total: ${(subframeStep * samples).toFixed(4)} frames`);
    }

    // Save original speed
    const originalSpeed = this.playback.speed;

    // Temporarily modify playback speed for sub-frame steps
    this.playback.speed = subframeStep;

    // Render and accumulate each subframe
    for (let i = 0; i < samples; i++) {
      if (signal.aborted) {
        this.playback.speed = originalSpeed;
        // Reset motion blur context
        this.playback.currentScene?.setMotionBlurSubframe?.(-1, 0, 1);
        return;
      }

      // Set motion blur subframe context
      this.playback.currentScene?.setMotionBlurSubframe?.(
        i,
        samples,
        weights[i],
      );

      // Render at current subframe position
      await this.stage.render(
        this.playback.currentScene!,
        this.playback.previousScene,
      );

      // Accumulate this sample with curve-based weight
      this.stage.accumulateMotionBlurSample(weights[i]);

      // Advance by subframe step to next sample position
      // Skip advance on last sample - main loop will handle frame progression
      if (i < samples - 1) {
        this.playback.speed = subframeStep;
        await this.playback.progress();
      }
    }

    // Restore original speed
    this.playback.speed = originalSpeed;

    // Finalize - write blurred result to canvas
    this.stage.finalizeMotionBlur();

    // Reset motion blur context
    this.playback.currentScene?.setMotionBlurSubframe?.(-1, 0, 1);
  }

  private async getMediaByFrames(settings: RendererSettings) {
    this.stage.configure(settings);
    this.playback.fps = settings.fps;
    this.playback.state = PlaybackState.Rendering;
    const from = this.status.secondsToFrames(settings.range[0]);
    this.frame.current = from;

    await this.reloadScenes(settings);
    await this.playback.recalculate();
    await this.playback.reset();

    const to = Math.min(
      this.playback.duration,
      this.status.secondsToFrames(settings.range[1]),
    );
    await this.playback.seek(from);

    const mediaAssets: AssetInfo[][] = [];
    try {
      const currentMediaAssets = this.playback.currentScene.getMediaAssets();
      mediaAssets.push(currentMediaAssets);

      let finished = false;
      while (!finished) {
        await this.playback.progress();
        mediaAssets.push(this.playback.currentScene.getMediaAssets());

        if (this.playback.finished || this.playback.frame >= to) {
          finished = true;
        }
      }
    } catch (e: any) {
      this.project.logger.error(e);
    }

    return mediaAssets;
  }
}
