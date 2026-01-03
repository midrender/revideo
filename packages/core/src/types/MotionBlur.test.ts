import {describe, expect, test} from 'vitest';
import {
  calculateAdaptiveSamples,
  calculateSubframeOffsets,
  calculateSubframeWeights,
  DEFAULT_MOTION_BLUR_CONFIG,
  describeMotionBlurConfig,
  MotionBlurConfig,
  QUALITY_SAMPLES,
  resolveMotionBlurConfig,
} from './MotionBlur';

describe('MotionBlur', () => {
  describe('DEFAULT_MOTION_BLUR_CONFIG', () => {
    test('has correct default values', () => {
      expect(DEFAULT_MOTION_BLUR_CONFIG).toEqual({
        enabled: false,
        samples: 8,
        shutterAngle: 180,
        shutterCurve: 'box',
        shutterPosition: 'center',
        adaptiveSampling: false,
        adaptiveMinSamples: 2,
        shutterPhase: -90,
      });
    });
  });

  describe('QUALITY_SAMPLES', () => {
    test('defines correct sample counts for each preset', () => {
      expect(QUALITY_SAMPLES.low).toBe(4);
      expect(QUALITY_SAMPLES.medium).toBe(8);
      expect(QUALITY_SAMPLES.high).toBe(16);
      expect(QUALITY_SAMPLES.ultra).toBe(32);
    });
  });

  describe('resolveMotionBlurConfig', () => {
    test('returns defaults when no options provided', () => {
      const config = resolveMotionBlurConfig();
      expect(config).toEqual(DEFAULT_MOTION_BLUR_CONFIG);
    });

    test('returns defaults when undefined provided', () => {
      const config = resolveMotionBlurConfig(undefined);
      expect(config).toEqual(DEFAULT_MOTION_BLUR_CONFIG);
    });

    test('merges partial options with defaults', () => {
      const config = resolveMotionBlurConfig({enabled: true});
      expect(config).toEqual({
        ...DEFAULT_MOTION_BLUR_CONFIG,
        enabled: true,
      });
    });

    test('allows overriding all options', () => {
      const custom = {
        enabled: true,
        samples: 16,
        shutterAngle: 270,
        shutterCurve: 'gaussian' as const,
        shutterPosition: 'start' as const,
        adaptiveSampling: true,
        adaptiveMinSamples: 4,
        shutterPhase: -135,
      };
      const config = resolveMotionBlurConfig(custom);
      expect(config).toEqual(custom);
    });

    test('resolves quality preset to samples', () => {
      expect(resolveMotionBlurConfig({quality: 'low'}).samples).toBe(4);
      expect(resolveMotionBlurConfig({quality: 'medium'}).samples).toBe(8);
      expect(resolveMotionBlurConfig({quality: 'high'}).samples).toBe(16);
      expect(resolveMotionBlurConfig({quality: 'ultra'}).samples).toBe(32);
    });

    test('samples takes precedence over quality', () => {
      const config = resolveMotionBlurConfig({quality: 'ultra', samples: 10});
      expect(config.samples).toBe(10);
    });

    test('clamps samples to valid range', () => {
      expect(resolveMotionBlurConfig({samples: 0}).samples).toBe(1);
      expect(resolveMotionBlurConfig({samples: -5}).samples).toBe(1);
      expect(resolveMotionBlurConfig({samples: 100}).samples).toBe(64);
      expect(resolveMotionBlurConfig({samples: 2.5}).samples).toBe(3);
    });

    test('clamps shutter angle to valid range', () => {
      expect(resolveMotionBlurConfig({shutterAngle: -10}).shutterAngle).toBe(0);
      expect(resolveMotionBlurConfig({shutterAngle: 800}).shutterAngle).toBe(
        720,
      );
    });

    test('clamps shutter phase to valid range', () => {
      expect(resolveMotionBlurConfig({shutterPhase: -400}).shutterPhase).toBe(
        -360,
      );
      expect(resolveMotionBlurConfig({shutterPhase: 400}).shutterPhase).toBe(
        360,
      );
    });

    test('converts shutterPosition to shutterPhase', () => {
      // center: -shutterAngle/2 = -90
      expect(
        resolveMotionBlurConfig({shutterPosition: 'center'}).shutterPhase,
      ).toBe(-90);
      // start: 0
      expect(
        resolveMotionBlurConfig({shutterPosition: 'start'}).shutterPhase,
      ).toBe(0);
      // end: -shutterAngle = -180
      expect(
        resolveMotionBlurConfig({shutterPosition: 'end'}).shutterPhase,
      ).toBe(-180);
    });
  });

  describe('calculateSubframeOffsets', () => {
    const fps24FrameDuration = 1 / 24;

    const makeConfig = (
      overrides: Partial<MotionBlurConfig> = {},
    ): MotionBlurConfig => ({
      ...DEFAULT_MOTION_BLUR_CONFIG,
      enabled: true,
      ...overrides,
    });

    test('returns correct number of offsets', () => {
      const config = makeConfig({samples: 8});
      const offsets = calculateSubframeOffsets(config, fps24FrameDuration);
      expect(offsets).toHaveLength(8);
    });

    test('returns single centered offset for 1 sample', () => {
      const config = makeConfig({samples: 1, shutterPhase: 0});
      const offsets = calculateSubframeOffsets(config, fps24FrameDuration);
      expect(offsets).toHaveLength(1);
    });

    test('offsets span the expected exposure window', () => {
      const config = makeConfig({samples: 4});
      const offsets = calculateSubframeOffsets(config, fps24FrameDuration);

      // Exposure time is 180/360 = 0.5 of frame duration
      const exposureTime = fps24FrameDuration * 0.5;

      // Check that the offsets span approximately the exposure window
      const minOffset = Math.min(...offsets);
      const maxOffset = Math.max(...offsets);
      const range = maxOffset - minOffset;

      expect(range).toBeCloseTo(exposureTime, 5);
    });

    test('higher shutter angle produces wider offset range', () => {
      const config180 = makeConfig({samples: 4, shutterAngle: 180});
      const config360 = makeConfig({samples: 4, shutterAngle: 360});

      const offsets180 = calculateSubframeOffsets(
        config180,
        fps24FrameDuration,
      );
      const offsets360 = calculateSubframeOffsets(
        config360,
        fps24FrameDuration,
      );

      const range180 = Math.max(...offsets180) - Math.min(...offsets180);
      const range360 = Math.max(...offsets360) - Math.min(...offsets360);

      expect(range360).toBeGreaterThan(range180);
      expect(range360).toBeCloseTo(range180 * 2, 5);
    });

    test('zero shutter angle produces zero offsets', () => {
      const config = makeConfig({samples: 4, shutterAngle: 0, shutterPhase: 0});
      const offsets = calculateSubframeOffsets(config, fps24FrameDuration);

      for (const offset of offsets) {
        expect(offset).toBeCloseTo(0, 10);
      }
    });
  });

  describe('calculateSubframeWeights', () => {
    const makeConfig = (
      overrides: Partial<MotionBlurConfig> = {},
    ): MotionBlurConfig => ({
      ...DEFAULT_MOTION_BLUR_CONFIG,
      enabled: true,
      ...overrides,
    });

    test('returns correct number of weights', () => {
      const config = makeConfig({samples: 8});
      const weights = calculateSubframeWeights(config);
      expect(weights).toHaveLength(8);
    });

    test('weights sum to 1 for box curve', () => {
      const config = makeConfig({samples: 16, shutterCurve: 'box'});
      const weights = calculateSubframeWeights(config);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    test('weights sum to 1 for triangle curve', () => {
      const config = makeConfig({samples: 16, shutterCurve: 'triangle'});
      const weights = calculateSubframeWeights(config);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    test('weights sum to 1 for gaussian curve', () => {
      const config = makeConfig({samples: 16, shutterCurve: 'gaussian'});
      const weights = calculateSubframeWeights(config);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    test('all weights are equal for box weighting', () => {
      const config = makeConfig({samples: 4, shutterCurve: 'box'});
      const weights = calculateSubframeWeights(config);

      const expectedWeight = 0.25;
      for (const weight of weights) {
        expect(weight).toBeCloseTo(expectedWeight, 10);
      }
    });

    test('triangle weights are highest at center', () => {
      const config = makeConfig({samples: 5, shutterCurve: 'triangle'});
      const weights = calculateSubframeWeights(config);

      // Middle element should be highest
      expect(weights[2]).toBeGreaterThan(weights[0]);
      expect(weights[2]).toBeGreaterThan(weights[4]);
    });

    test('gaussian weights are highest at center', () => {
      const config = makeConfig({samples: 5, shutterCurve: 'gaussian'});
      const weights = calculateSubframeWeights(config);

      // Middle element should be highest
      expect(weights[2]).toBeGreaterThan(weights[0]);
      expect(weights[2]).toBeGreaterThan(weights[4]);
    });

    test('single sample has weight of 1', () => {
      const config = makeConfig({samples: 1});
      const weights = calculateSubframeWeights(config);
      expect(weights).toHaveLength(1);
      expect(weights[0]).toBe(1);
    });
  });

  describe('calculateAdaptiveSamples', () => {
    const makeConfig = (
      overrides: Partial<MotionBlurConfig> = {},
    ): MotionBlurConfig => ({
      ...DEFAULT_MOTION_BLUR_CONFIG,
      enabled: true,
      samples: 16,
      adaptiveSampling: true,
      adaptiveMinSamples: 2,
      ...overrides,
    });

    test('returns full samples when adaptive disabled', () => {
      const config = makeConfig({adaptiveSampling: false});
      expect(calculateAdaptiveSamples(config, 100)).toBe(16);
    });

    test('returns full samples at high velocity', () => {
      const config = makeConfig();
      expect(calculateAdaptiveSamples(config, 100, 50)).toBe(16);
    });

    test('returns minimum samples at zero velocity', () => {
      const config = makeConfig();
      expect(calculateAdaptiveSamples(config, 0)).toBe(2);
    });

    test('scales samples based on velocity', () => {
      const config = makeConfig();
      const halfVelocitySamples = calculateAdaptiveSamples(config, 25, 50);
      expect(halfVelocitySamples).toBeGreaterThan(2);
      expect(halfVelocitySamples).toBeLessThan(16);
    });

    test('respects minimum samples', () => {
      const config = makeConfig({adaptiveMinSamples: 4});
      expect(calculateAdaptiveSamples(config, 0)).toBe(4);
    });
  });

  describe('describeMotionBlurConfig', () => {
    const makeConfig = (
      overrides: Partial<MotionBlurConfig> = {},
    ): MotionBlurConfig => ({
      ...DEFAULT_MOTION_BLUR_CONFIG,
      ...overrides,
    });

    test('returns disabled message when disabled', () => {
      const config = makeConfig({enabled: false});
      expect(describeMotionBlurConfig(config)).toBe('Motion blur disabled');
    });

    test('includes basic info when enabled', () => {
      const config = makeConfig({enabled: true, samples: 8, shutterAngle: 180});
      const desc = describeMotionBlurConfig(config);
      expect(desc).toContain('8 samples');
      expect(desc).toContain('180° shutter');
    });

    test('includes curve when not box', () => {
      const config = makeConfig({enabled: true, shutterCurve: 'gaussian'});
      expect(describeMotionBlurConfig(config)).toContain('gaussian curve');
    });

    test('includes position when not center', () => {
      const config = makeConfig({enabled: true, shutterPosition: 'start'});
      expect(describeMotionBlurConfig(config)).toContain('start position');
    });

    test('includes adaptive when enabled', () => {
      const config = makeConfig({enabled: true, adaptiveSampling: true});
      expect(describeMotionBlurConfig(config)).toContain('adaptive');
    });
  });
});
