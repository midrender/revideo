import type {Scene} from '../scenes';
import {unwrap} from '../signals';
import type {CanvasColorSpace, Color, MotionBlurConfig} from '../types';
import {
  DEFAULT_MOTION_BLUR_CONFIG,
  resolveMotionBlurConfig,
  Vector2,
} from '../types';
import {getContext} from '../utils';

export interface StageSettings {
  size: Vector2;
  resolutionScale: number;
  colorSpace: CanvasColorSpace;
  background: Color | string | null;
  motionBlur?: Partial<MotionBlurConfig>;
}

/**
 * Manages canvases on which an animation can be displayed.
 */
export class Stage {
  // TODO Consider adding pooling for canvases.

  private background: string | null = null;
  private resolutionScale = 1;
  private colorSpace: CanvasColorSpace = 'srgb';
  private size = Vector2.zero;
  private motionBlurConfig: MotionBlurConfig = {...DEFAULT_MOTION_BLUR_CONFIG};

  public readonly finalBuffer: HTMLCanvasElement;
  private readonly currentBuffer: HTMLCanvasElement;
  private readonly previousBuffer: HTMLCanvasElement;

  /**
   * Accumulation buffer for motion blur.
   * Uses Float32Array for high precision during accumulation.
   */
  private accumulationBuffer: Float32Array | null = null;
  private accumulationSamples = 0;

  private context: CanvasRenderingContext2D;
  private currentContext: CanvasRenderingContext2D;
  private previousContext: CanvasRenderingContext2D;

  private get canvasSize() {
    return this.size.scale(this.resolutionScale);
  }

  public constructor() {
    this.finalBuffer = document.createElement('canvas');
    this.currentBuffer = document.createElement('canvas');
    this.previousBuffer = document.createElement('canvas');

    const colorSpace = this.colorSpace;
    this.context = getContext({colorSpace}, this.finalBuffer);
    this.currentContext = getContext({colorSpace}, this.currentBuffer);
    this.previousContext = getContext({colorSpace}, this.previousBuffer);
  }

  /**
   * Get the current motion blur configuration.
   */
  public getMotionBlurConfig(): MotionBlurConfig {
    return this.motionBlurConfig;
  }

  public configure({
    colorSpace = this.colorSpace,
    size = this.size,
    resolutionScale = this.resolutionScale,
    background = this.background,
    motionBlur,
  }: Partial<StageSettings>) {
    if (colorSpace !== this.colorSpace) {
      this.colorSpace = colorSpace;
      this.context = getContext({colorSpace}, this.finalBuffer);
      this.currentContext = getContext({colorSpace}, this.currentBuffer);
      this.previousContext = getContext({colorSpace}, this.previousBuffer);
    }

    if (
      !size.exactlyEquals(this.size) ||
      resolutionScale !== this.resolutionScale
    ) {
      this.resolutionScale = resolutionScale;
      this.size = size;
      this.resizeCanvas(this.context);
      this.resizeCanvas(this.currentContext);
      this.resizeCanvas(this.previousContext);
      // Reset accumulation buffer on resize
      this.accumulationBuffer = null;
    }

    this.background =
      typeof background === 'string'
        ? background
        : (background?.serialize() ?? null);

    // Update motion blur configuration
    if (motionBlur !== undefined) {
      this.motionBlurConfig = resolveMotionBlurConfig(motionBlur);
    }
  }

  public async render(
    currentScene: Scene,
    previousScene: Scene | null,
    options: {clearCanvas?: boolean} = {},
  ) {
    const {clearCanvas = true} = options;
    const previousOnTop = previousScene
      ? unwrap(currentScene.previousOnTop)
      : false;

    if (previousScene) {
      await previousScene.render(this.previousContext);
    }

    await currentScene.render(this.currentContext);

    const size = this.canvasSize;
    if (clearCanvas) {
      this.context.clearRect(0, 0, size.width, size.height);
      if (this.background) {
        this.context.save();
        this.context.fillStyle = this.background;
        this.context.fillRect(0, 0, size.width, size.height);
        this.context.restore();
      }
    }

    if (previousScene && !previousOnTop) {
      this.context.drawImage(this.previousBuffer, 0, 0);
    }
    this.context.drawImage(this.currentBuffer, 0, 0);
    if (previousOnTop) {
      this.context.drawImage(this.previousBuffer, 0, 0);
    }
  }

  public resizeCanvas(context: CanvasRenderingContext2D) {
    const size = this.canvasSize;
    context.canvas.width = size.width;
    context.canvas.height = size.height;
  }

  /**
   * Begin accumulating samples for motion blur.
   * Call this before the first subframe render.
   */
  public beginMotionBlurAccumulation(): void {
    const size = this.canvasSize;
    const bufferSize = size.width * size.height * 4;

    // Create or reset accumulation buffer
    if (
      !this.accumulationBuffer ||
      this.accumulationBuffer.length !== bufferSize
    ) {
      this.accumulationBuffer = new Float32Array(bufferSize);
    } else {
      this.accumulationBuffer.fill(0);
    }

    this.accumulationSamples = 0;
  }

  /**
   * Accumulate the current frame into the motion blur buffer.
   * Call this after each subframe render.
   *
   * @param weight - Weight for this sample (typically 1/samples)
   */
  public accumulateMotionBlurSample(weight: number): void {
    if (!this.accumulationBuffer) {
      return;
    }

    const size = this.canvasSize;
    const imageData = this.context.getImageData(0, 0, size.width, size.height);
    const pixels = imageData.data;

    // Accumulate weighted pixel values
    for (let i = 0; i < pixels.length; i++) {
      this.accumulationBuffer[i] += pixels[i] * weight;
    }

    this.accumulationSamples++;
  }

  /**
   * Finalize motion blur accumulation and write to finalBuffer.
   * Call this after all subframe renders are complete.
   */
  public finalizeMotionBlur(): void {
    if (!this.accumulationBuffer || this.accumulationSamples === 0) {
      return;
    }

    const size = this.canvasSize;
    const imageData = this.context.createImageData(size.width, size.height);
    const pixels = imageData.data;

    // Convert accumulated values back to 8-bit pixels
    for (let i = 0; i < pixels.length; i++) {
      // Clamp to 0-255 range (accumulated values are already weighted)
      pixels[i] = Math.round(
        Math.min(255, Math.max(0, this.accumulationBuffer[i])),
      );
    }

    // Write the blurred result to the final buffer
    this.context.putImageData(imageData, 0, 0);
  }

  /**
   * Render with motion blur using the provided render callback.
   * This method handles the accumulation loop internally.
   *
   * @param renderCallback - Async function that renders a single subframe
   * @param subframeOffsets - Time offsets for each subframe in seconds
   * @param weights - Weight for each subframe (should sum to 1)
   */
  public async renderWithMotionBlur(
    renderCallback: (timeOffset: number) => Promise<void>,
    subframeOffsets: number[],
    weights: number[],
  ): Promise<void> {
    if (
      subframeOffsets.length === 0 ||
      subframeOffsets.length !== weights.length
    ) {
      return;
    }

    this.beginMotionBlurAccumulation();

    for (let i = 0; i < subframeOffsets.length; i++) {
      // Render subframe (callback should call stage.render() internally)
      await renderCallback(subframeOffsets[i]);

      // Accumulate this sample
      this.accumulateMotionBlurSample(weights[i]);
    }

    this.finalizeMotionBlur();
  }
}
