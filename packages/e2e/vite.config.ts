/// <reference types="vitest" />

import motionCanvas from '@revideo/vite-plugin';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [
    motionCanvas.default({
      project: ['./tests/project.ts'],
    }),
  ],
  test: {
    // The editor and render pipeline are transformed on demand by the Vite dev
    // server on first load, which is slow when cold; allow generous headroom.
    hookTimeout: 120000,
    testTimeout: 180000,
  },
});
