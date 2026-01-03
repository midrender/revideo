import {renderVideo} from '@revideo/renderer';

async function render() {
  console.log('Rendering motion blur test video...');
  console.log('This will render a side-by-side comparison of motion blur ON vs OFF');

  const file = await renderVideo({
    projectFile: './src/motion-blur.ts',
    settings: {
      logProgress: true,
      outFile: 'motion-blur-demo.mp4',
      outDir: './output',
    },
  });

  console.log(`Rendered video to ${file}`);
}

render().catch(console.error);
