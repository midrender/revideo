# Motion Blur for Revideo

Professional-grade motion blur for programmatic video rendering using temporal sub-frame accumulation.

<p align="center">
  <img src="./motion-blur-demo.gif" alt="Motion Blur Demo - Left side shows blur, right side shows sharp reference" width="800">
</p>

*Left side: Motion blur ON | Right side: Motion blur OFF (per-element control)*

## Overview

Motion blur simulates the blur that occurs in real cameras when objects move during the exposure time. This implementation uses **temporal sub-frame accumulation** - rendering multiple sub-frames at different points in time and blending them together to create realistic motion blur effects.

### Key Features

- **Quality presets** - Low (4), medium (8), high (16), ultra (32) samples
- **Shutter curves** - Box (uniform), triangle (linear falloff), gaussian (bell curve)
- **Shutter position** - Center, start, or end alignment
- **Per-element control** - Enable/disable blur on individual elements
- **Professional shutter angle** - 0-720° support (film standard is 180°)

## Quick Start

### Basic Usage

Enable motion blur in your project configuration:

```typescript
import {makeProject} from '@revideo/core';
import scene from './scenes/my-scene';

export default makeProject({
  scenes: [scene],
  settings: {
    rendering: {
      motionBlur: {
        enabled: true,
        quality: 'high', // 16 samples
      },
    },
  },
});
```

### Advanced Configuration

```typescript
motionBlur: {
  enabled: true,

  // Quality preset: 'low' (4), 'medium' (8), 'high' (16), 'ultra' (32)
  // Or set 'samples' directly for custom count
  quality: 'high',

  // Shutter angle: exposure time in degrees
  // 180° = standard film (50% of frame exposed)
  // 360° = full frame exposure (maximum blur)
  shutterAngle: 180,

  // Shutter curve: weight distribution for samples
  // 'box' = equal weight (sharp, can show stepping)
  // 'triangle' = linear falloff from center (softer)
  // 'gaussian' = bell curve (most natural, like real cameras)
  shutterCurve: 'gaussian',

  // Shutter position: when blur occurs relative to frame
  // 'center' = blur straddles the frame (recommended)
  // 'start' = blur trails behind (forward blur)
  // 'end' = blur leads ahead (backward blur)
  shutterPosition: 'center',
}
```

## Per-Element Motion Blur Control

You can override motion blur on individual elements. This is useful for:
- Keeping text and UI elements sharp
- Creating visual contrast between static and moving elements
- Performance optimization by only blurring what needs it

### Disabling Blur on Specific Elements

```tsx
import {Circle, Txt, makeScene2D} from '@revideo/2d';

export default makeScene2D('scene', function* (view) {
  view.add(
    <>
      {/* This circle will have motion blur applied */}
      <Circle
        x={0}
        y={0}
        width={100}
        height={100}
        fill="#3b82f6"
      />

      {/* This text will stay sharp (no motion blur) */}
      <Txt
        text="Score: 100"
        fill="white"
        fontSize={48}
        motionBlur={{enabled: false}}
      />
    </>
  );
});
```

### Split-Screen Comparison Example

```tsx
import {Circle, Line, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef} from '@revideo/core';

export default makeScene2D('comparison', function* (view) {
  const blurredCircle = createRef<Circle>();
  const sharpCircle = createRef<Circle>();

  view.add(
    <>
      {/* Divider line - stays sharp */}
      <Line
        points={[[0, -540], [0, 540]]}
        stroke="white"
        lineWidth={2}
        motionBlur={{enabled: false}}
      />

      {/* Left side: Motion blur ON (default) */}
      <Txt text="Blur: ON" x={-300} y={-400} motionBlur={{enabled: false}} />
      <Circle ref={blurredCircle} x={-300} y={0} width={100} fill="blue" />

      {/* Right side: Motion blur OFF */}
      <Txt text="Blur: OFF" x={300} y={-400} motionBlur={{enabled: false}} />
      <Circle ref={sharpCircle} x={300} y={0} width={100} fill="blue"
              motionBlur={{enabled: false}} />
    </>
  );

  // Animate both identically - only left will blur
  yield* all(
    blurredCircle().position.x(-100, 0.5).to(-500, 0.5),
    sharpCircle().position.x(500, 0.5).to(100, 0.5),
  );
});
```

## Configuration Reference

### MotionBlurConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable/disable motion blur |
| `samples` | `number` | `8` | Number of sub-frames (1-64) |
| `quality` | `'low' \| 'medium' \| 'high' \| 'ultra'` | - | Quality preset (sets samples) |
| `shutterAngle` | `number` | `180` | Shutter angle in degrees (0-720) |
| `shutterCurve` | `'box' \| 'triangle' \| 'gaussian'` | `'box'` | Sample weight distribution |
| `shutterPosition` | `'center' \| 'start' \| 'end'` | `'center'` | Blur alignment relative to frame |
| `adaptiveSampling` | `boolean` | `false` | Enable velocity-based sample scaling |
| `adaptiveMinSamples` | `number` | `2` | Minimum samples when adaptive |

### Quality Presets

| Preset | Samples | Use Case |
|--------|---------|----------|
| `low` | 4 | Fast previews, draft renders |
| `medium` | 8 | Good balance of quality/speed |
| `high` | 16 | High quality production renders |
| `ultra` | 32 | Maximum quality, slow |

### Shutter Angle Guide

| Angle | Exposure | Effect |
|-------|----------|--------|
| 90° | 25% | Minimal blur, staccato motion |
| 180° | 50% | Film standard, natural motion |
| 270° | 75% | Pronounced blur |
| 360° | 100% | Maximum blur, dreamy effect |

### Shutter Curves

| Curve | Description | Best For |
|-------|-------------|----------|
| `box` | Equal weight for all samples | Sharp, defined blur edges |
| `triangle` | Linear falloff from center | Softer blur, good balance |
| `gaussian` | Bell curve distribution | Most natural, mimics real cameras |

### Shutter Position

| Position | Description | Visual Effect |
|----------|-------------|---------------|
| `center` | Blur straddles the frame | Balanced, recommended |
| `start` | Blur trails behind | Forward/leading motion |
| `end` | Blur leads ahead | Backward/trailing motion |

## How It Works

### Temporal Sub-Frame Accumulation

1. **Begin accumulation**: Initialize a high-precision float buffer
2. **Two-pass rendering**:
   - **Pass 1 (blur)**: Render blur-enabled elements multiple times at sub-frame positions
   - **Pass 2 (static)**: Render blur-disabled elements once, composited on top
3. **Weight and blend**: Each sub-frame is weighted according to the shutter curve
4. **Finalize**: Convert accumulated values back to standard pixel format

### Per-Element Control Architecture

The renderer uses a two-pass approach:

```
Frame N:
├── Pass 1: Motion Blur (sub-frame accumulation)
│   ├── Subframe 0: Render blur-enabled elements, accumulate
│   ├── Subframe 1: Advance time, render, accumulate
│   ├── ...
│   └── Subframe N: Final accumulation, normalize
│
└── Pass 2: Static Elements
    └── Render blur-disabled elements on top (no accumulation)
```

This ensures:
- Elements with `motionBlur={{enabled: false}}` remain perfectly sharp
- Blurred elements composite naturally behind static elements
- UI, text, and reference elements stay crisp

## Rendering

### Using the Render Script

```bash
# From the examples package
npm run render:motion-blur

# Or with custom output
node dist/render-motion-blur.js --output my-video.mp4
```

### Programmatic Rendering

```typescript
import {renderVideo} from '@revideo/renderer';

await renderVideo({
  projectFile: './src/motion-blur.ts',
  output: {
    file: 'output.mp4',
    codec: 'h264',
  },
  settings: {
    motionBlur: {
      enabled: true,
      quality: 'high',
      shutterCurve: 'gaussian',
    },
  },
});
```

## Performance Considerations

- **Sample count directly affects render time**: 16 samples = 16x more scene renders
- **Use quality presets**: Start with `medium`, increase if needed
- **Per-element control**: Disable blur on static elements for better performance
- **Adaptive sampling** (experimental): Reduces samples for slow-moving areas

### Performance Tips

1. Use `quality: 'low'` for previews during development
2. Only apply motion blur to elements that actually move
3. Disable blur on text and UI elements
4. Consider `shutterCurve: 'gaussian'` - looks better with fewer samples

## Troubleshooting

### Motion blur not appearing

1. Ensure `enabled: true` is set in project settings
2. Check that rendering (not preview) mode is being used
3. Verify the element is moving fast enough to show visible blur

### Black or missing elements

1. Check that parent containers don't have `motionBlur={{enabled: false}}`
2. Ensure elements have valid opacity (> 0)
3. Verify z-order of static vs. blurred elements

### Stepping artifacts visible

1. Increase sample count (`quality: 'high'` or `'ultra'`)
2. Switch to `shutterCurve: 'gaussian'` for smoother blending
3. Try `shutterCurve: 'triangle'` as a compromise

## API Reference

### Types

```typescript
type ShutterCurve = 'box' | 'triangle' | 'gaussian';
type ShutterPosition = 'center' | 'start' | 'end';
type MotionBlurQuality = 'low' | 'medium' | 'high' | 'ultra';

interface MotionBlurConfig {
  enabled: boolean;
  samples: number;
  shutterAngle: number;
  shutterCurve: ShutterCurve;
  shutterPosition: ShutterPosition;
  adaptiveSampling: boolean;
  adaptiveMinSamples: number;
}
```

### Utility Functions

```typescript
import {
  resolveMotionBlurConfig,
  calculateSubframeOffsets,
  calculateSubframeWeights,
  calculateAdaptiveSamples,
  describeMotionBlurConfig,
} from '@revideo/core';

// Resolve partial config to full config
const config = resolveMotionBlurConfig({quality: 'high', shutterCurve: 'gaussian'});

// Get time offsets for sub-frames
const offsets = calculateSubframeOffsets(config, 1/60); // 60fps

// Get weights for each sub-frame
const weights = calculateSubframeWeights(config);

// Get human-readable description
console.log(describeMotionBlurConfig(config));
// "Motion blur: 16 samples, 180° shutter, gaussian curve"
```

## License

This feature is part of Revideo and is licensed under the MIT License.
