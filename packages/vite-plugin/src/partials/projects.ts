import type {Plugin} from 'vite';
import type {PluginOptions} from '../plugins';
import type {Projects} from '../utils';
// import {getVersions} from '../versions';

interface ProjectPluginConfig {
  buildForEditor?: boolean;
  plugins: PluginOptions[];
  projects: Projects;
}

export function projectsPlugin({
  buildForEditor,
  projects,
}: ProjectPluginConfig): Plugin {
  // TODO(refactor): use version information
  // const versions = JSON.stringify(getVersions());
  return {
    name: 'revideo:project',

    config(config) {
      return {
        build: {
          // Vite dropped its `'modules'` target alias in v8; use its former
          // expansion (browsers with native ESM support) to keep project
          // bundles broadly compatible when played back.
          target: buildForEditor
            ? 'esnext'
            : ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
          assetsDir: './',
          rollupOptions: {
            preserveEntrySignatures: 'strict',
            input: Object.fromEntries(
              projects.list.map(project => [project.name, project.url]),
            ),
          },
        },
        server: {
          port: config?.server?.port ?? 9000,
        },
        // Vite 8 transforms source with `oxc`, so scenes compile against the
        // revideo JSX runtime through it. (Vite <8 used `esbuild.jsx` here, but
        // that option no longer exists on Vite 8's config type.)
        oxc: {
          jsx: {
            runtime: 'automatic',
            importSource: '@revideo/2d/lib',
          },
        },
        optimizeDeps: {
          entries: projects.list.map(project => project.url),
          exclude: ['preact', 'preact/*', '@preact/signals'],
        },
      };
    },
  };
}
