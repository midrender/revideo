import {makeProject} from '@revideo/core';

import scene from './scenes/motion-blur';

export default makeProject({
  scenes: [scene],
  settings: {
    rendering: {
      // Motion blur configuration
      // Uses temporal sub-frame accumulation for realistic motion blur
      motionBlur: {
        enabled: true,

        // Quality preset: 'low' (4), 'medium' (8), 'high' (16), 'ultra' (32)
        // Or set 'samples' directly for custom count
        quality: 'high', // 16 samples

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
      },
    },
  },
});
