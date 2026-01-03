/**
 * Motion Blur Configuration and Utilities
 *
 * This module provides configuration types and utility functions for
 * motion blur rendering using temporal sub-frame accumulation.
 *
 * @packageDocumentation
 */

/**
 * Shutter curve types that determine how samples are weighted.
 *
 * - `box`: Equal weight for all samples (default, sharp edges)
 * - `triangle`: Linear falloff from center (softer)
 * - `gaussian`: Bell curve falloff (most natural, like real cameras)
 */
export type ShutterCurve = 'box' | 'triangle' | 'gaussian';

/**
 * Shutter position relative to the frame time.
 *
 * - `center`: Blur is centered on the frame (recommended)
 * - `start`: Blur starts at frame time (forward/trailing blur)
 * - `end`: Blur ends at frame time (backward/leading blur)
 */
export type ShutterPosition = 'center' | 'start' | 'end';

/**
 * Quality presets for motion blur.
 *
 * - `low`: 4 samples (fast, draft quality)
 * - `medium`: 8 samples (balanced)
 * - `high`: 16 samples (high quality)
 * - `ultra`: 32 samples (maximum quality, slow)
 */
export type MotionBlurQuality = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Sample counts for each quality preset.
 */
export const QUALITY_SAMPLES: Record<MotionBlurQuality, number> = {
  low: 4,
  medium: 8,
  high: 16,
  ultra: 32,
};

/**
 * Configuration for motion blur rendering.
 *
 * Motion blur simulates the blur that occurs in real cameras when objects
 * move during the exposure time. This implementation uses temporal sub-frame
 * accumulation - rendering multiple sub-frames at different points in time
 * and blending them together.
 *
 * @example
 * ```typescript
 * // Basic usage with quality preset
 * motionBlur: {
 *   enabled: true,
 *   quality: 'high',
 * }
 *
 * // Advanced usage with custom settings
 * motionBlur: {
 *   enabled: true,
 *   samples: 16,
 *   shutterAngle: 180,
 *   shutterCurve: 'gaussian',
 *   shutterPosition: 'center',
 * }
 * ```
 */
export interface MotionBlurConfig {
  /**
   * Whether motion blur is enabled.
   *
   * @defaultValue `false`
   */
  enabled: boolean;

  /**
   * Number of samples (sub-frames) to render per frame.
   *
   * Higher values produce smoother blur but require more render time.
   * Use `quality` preset for convenience, or set this directly.
   *
   * @defaultValue `8`
   */
  samples: number;

  /**
   * Shutter angle in degrees (0-720).
   *
   * This simulates a rotary disc shutter like those used in film cameras.
   * - 180 degrees: Standard film motion blur (50% of frame time exposed)
   * - 360 degrees: Maximum blur (100% of frame time exposed)
   * - 90 degrees: Minimal blur (25% of frame time exposed)
   *
   * @defaultValue `180`
   */
  shutterAngle: number;

  /**
   * Shutter curve type for sample weighting.
   *
   * - `box`: Equal weight (sharp, can show stepping artifacts)
   * - `triangle`: Linear falloff from center (softer)
   * - `gaussian`: Bell curve (most natural, recommended)
   *
   * @defaultValue `'box'`
   */
  shutterCurve: ShutterCurve;

  /**
   * Shutter position relative to frame time.
   *
   * - `center`: Blur straddles the frame (half before, half after)
   * - `start`: Blur trails behind (forward blur)
   * - `end`: Blur leads ahead (backward blur)
   *
   * @defaultValue `'center'`
   */
  shutterPosition: ShutterPosition;

  /**
   * Enable adaptive sampling based on motion speed.
   *
   * When enabled, fast-moving areas get more samples while
   * slow/static areas get fewer, improving performance.
   *
   * @defaultValue `false`
   */
  adaptiveSampling: boolean;

  /**
   * Minimum samples when adaptive sampling is enabled.
   *
   * @defaultValue `2`
   */
  adaptiveMinSamples: number;

  /**
   * Legacy: Shutter phase in degrees (-360 to 360).
   *
   * @deprecated Use `shutterPosition` instead. This is kept for
   * backward compatibility.
   *
   * @defaultValue `-90`
   */
  shutterPhase: number;
}

/**
 * Default motion blur configuration.
 */
export const DEFAULT_MOTION_BLUR_CONFIG: MotionBlurConfig = {
  enabled: false,
  samples: 8,
  shutterAngle: 180,
  shutterCurve: 'box',
  shutterPosition: 'center',
  adaptiveSampling: false,
  adaptiveMinSamples: 2,
  shutterPhase: -90,
};

/**
 * Partial motion blur configuration for user input.
 * Also supports `quality` preset for convenience.
 */
export type MotionBlurOptions = Partial<MotionBlurConfig> & {
  /**
   * Quality preset that sets the sample count.
   * If both `quality` and `samples` are provided, `samples` takes precedence.
   */
  quality?: MotionBlurQuality;
};

/**
 * Merges user motion blur options with defaults.
 *
 * @param options - User-provided options
 * @returns Complete motion blur configuration
 */
export function resolveMotionBlurConfig(
  options?: MotionBlurOptions,
): MotionBlurConfig {
  if (!options) {
    return {...DEFAULT_MOTION_BLUR_CONFIG};
  }

  // Resolve samples from quality preset or direct value
  let samples = options.samples ?? DEFAULT_MOTION_BLUR_CONFIG.samples;
  if (options.quality && !options.samples) {
    samples = QUALITY_SAMPLES[options.quality];
  }

  // Convert shutterPosition to shutterPhase for backward compatibility
  let shutterPhase =
    options.shutterPhase ?? DEFAULT_MOTION_BLUR_CONFIG.shutterPhase;
  if (options.shutterPosition && !options.shutterPhase) {
    const shutterAngle =
      options.shutterAngle ?? DEFAULT_MOTION_BLUR_CONFIG.shutterAngle;
    shutterPhase = calculatePhaseFromPosition(
      options.shutterPosition,
      shutterAngle,
    );
  }

  return {
    enabled: options.enabled ?? DEFAULT_MOTION_BLUR_CONFIG.enabled,
    samples: clampSamples(samples),
    shutterAngle: clampShutterAngle(
      options.shutterAngle ?? DEFAULT_MOTION_BLUR_CONFIG.shutterAngle,
    ),
    shutterCurve:
      options.shutterCurve ?? DEFAULT_MOTION_BLUR_CONFIG.shutterCurve,
    shutterPosition:
      options.shutterPosition ?? DEFAULT_MOTION_BLUR_CONFIG.shutterPosition,
    adaptiveSampling:
      options.adaptiveSampling ?? DEFAULT_MOTION_BLUR_CONFIG.adaptiveSampling,
    adaptiveMinSamples: Math.max(
      1,
      options.adaptiveMinSamples ?? DEFAULT_MOTION_BLUR_CONFIG.adaptiveMinSamples,
    ),
    shutterPhase: clampShutterPhase(shutterPhase),
  };
}

/**
 * Calculate shutter phase from position preset.
 */
function calculatePhaseFromPosition(
  position: ShutterPosition,
  shutterAngle: number,
): number {
  switch (position) {
    case 'center':
      return -shutterAngle / 2;
    case 'start':
      return 0;
    case 'end':
      return -shutterAngle;
  }
}

/**
 * Clamp samples to valid range (1-64).
 */
function clampSamples(samples: number): number {
  return Math.max(1, Math.min(64, Math.round(samples)));
}

/**
 * Clamp shutter angle to valid range (0-720).
 * 720 allows double exposure for artistic effects.
 */
function clampShutterAngle(angle: number): number {
  return Math.max(0, Math.min(720, angle));
}

/**
 * Clamp shutter phase to valid range (-360 to 360).
 */
function clampShutterPhase(phase: number): number {
  return Math.max(-360, Math.min(360, phase));
}

/**
 * Calculate the time offsets for sub-frame samples.
 *
 * @param config - Motion blur configuration
 * @param frameDuration - Duration of one frame in seconds
 * @returns Array of time offsets in seconds for each sample
 */
export function calculateSubframeOffsets(
  config: MotionBlurConfig,
  frameDuration: number,
): number[] {
  const {samples, shutterAngle, shutterPhase} = config;

  // Convert shutter angle to fraction of frame time
  const shutterFraction = shutterAngle / 360;

  // Total exposure time
  const exposureTime = frameDuration * shutterFraction;

  // Phase offset (convert degrees to fraction of frame time)
  const phaseOffset = (shutterPhase / 360) * frameDuration;

  const offsets: number[] = [];

  for (let i = 0; i < samples; i++) {
    // Distribute samples evenly across the exposure window
    const samplePosition = samples === 1 ? 0.5 : i / (samples - 1);
    const timeOffset =
      phaseOffset + samplePosition * exposureTime - exposureTime / 2;
    offsets.push(timeOffset);
  }

  return offsets;
}

/**
 * Calculate weight for each sub-frame sample based on shutter curve.
 *
 * @param config - Motion blur configuration
 * @returns Array of weights for each sample (normalized to sum to 1)
 */
export function calculateSubframeWeights(config: MotionBlurConfig): number[] {
  const {samples, shutterCurve} = config;

  let weights: number[];

  switch (shutterCurve) {
    case 'triangle':
      weights = calculateTriangleWeights(samples);
      break;
    case 'gaussian':
      weights = calculateGaussianWeights(samples);
      break;
    case 'box':
    default:
      weights = calculateBoxWeights(samples);
      break;
  }

  // Normalize weights to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Box (uniform) weighting - equal weight for all samples.
 */
function calculateBoxWeights(samples: number): number[] {
  return Array(samples).fill(1);
}

/**
 * Triangle weighting - linear falloff from center.
 * Creates a softer blur than box.
 */
function calculateTriangleWeights(samples: number): number[] {
  const weights: number[] = [];
  const center = (samples - 1) / 2;

  for (let i = 0; i < samples; i++) {
    // Distance from center, normalized to 0-1
    const distance = Math.abs(i - center) / (samples / 2);
    // Triangle: weight = 1 at center, 0 at edges
    weights.push(1 - distance);
  }

  return weights;
}

/**
 * Gaussian weighting - bell curve falloff from center.
 * Most natural looking, mimics real camera shutter behavior.
 */
function calculateGaussianWeights(samples: number): number[] {
  const weights: number[] = [];
  const center = (samples - 1) / 2;
  // Sigma controls the spread - 0.4 gives nice falloff within the sample range
  const sigma = samples / 4;

  for (let i = 0; i < samples; i++) {
    const x = i - center;
    // Gaussian: e^(-x^2 / (2 * sigma^2))
    const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
    weights.push(weight);
  }

  return weights;
}

/**
 * Calculate adaptive sample count based on motion velocity.
 *
 * @param config - Motion blur configuration
 * @param velocity - Object velocity in pixels per frame
 * @param threshold - Velocity threshold for full samples (default: 50px/frame)
 * @returns Adjusted sample count
 */
export function calculateAdaptiveSamples(
  config: MotionBlurConfig,
  velocity: number,
  threshold = 50,
): number {
  if (!config.adaptiveSampling) {
    return config.samples;
  }

  // Scale samples based on velocity
  // At threshold velocity, use full samples
  // Below threshold, scale down proportionally
  const scale = Math.min(1, velocity / threshold);
  const adaptedSamples = Math.round(
    config.adaptiveMinSamples +
      (config.samples - config.adaptiveMinSamples) * scale,
  );

  return Math.max(config.adaptiveMinSamples, adaptedSamples);
}

/**
 * Get a human-readable description of the motion blur configuration.
 *
 * @param config - Motion blur configuration
 * @returns Description string
 */
export function describeMotionBlurConfig(config: MotionBlurConfig): string {
  if (!config.enabled) {
    return 'Motion blur disabled';
  }

  const parts = [
    `${config.samples} samples`,
    `${config.shutterAngle}° shutter`,
    config.shutterCurve !== 'box' ? `${config.shutterCurve} curve` : null,
    config.shutterPosition !== 'center'
      ? `${config.shutterPosition} position`
      : null,
    config.adaptiveSampling ? 'adaptive' : null,
  ].filter(Boolean);

  return `Motion blur: ${parts.join(', ')}`;
}
