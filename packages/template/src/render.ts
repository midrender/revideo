import {renderVideo} from '@revideo/renderer';

async function render() {
  console.log('Rendering video...');

  const file = await renderVideo({
    projectFile: './src/project.ts',
    settings: {
      logProgress: true,
      renderSettings: {
        exporter: {
          name: '@revideo/core/wasm',
          options: {
            format: 'mp4',
          },
        },
      },
    },
  });

  console.log(`Rendered video to ${file}`);
}

render();
