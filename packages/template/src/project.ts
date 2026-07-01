import {makeProject} from '@revideo/core';

import example from './example';

import './global.css';

export const project = makeProject({
  name: 'project',
  scenes: [example],
  settings: {
    shared: {
      background: '#0d0d12',
      range: [0, Infinity],
      size: {x: 1080, y: 1080},
    },
    preview: {
      fps: 30,
      resolutionScale: 1,
    },
    rendering: {
      exporter: {
        name: '@revideo/core/wasm',
      },
      fps: 30,
      resolutionScale: 1,
      colorSpace: 'srgb',
    },
  },
});

export default project;
