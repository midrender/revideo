import fs from 'fs';
import path from 'path';
import type {Plugin} from 'vite';
import type {Projects} from '../utils';
import {getVersions} from '../versions';

interface EditorPluginConfig {
  editor: string;
  projects: Projects;
}

export function editorPlugin({editor, projects}: EditorPluginConfig): Plugin {
  const editorPath = path.dirname(require.resolve(editor));
  const editorFile = fs.readFileSync(path.resolve(editorPath, 'editor.html'));
  const htmlParts = editorFile
    .toString()
    .replace('{{style}}', `/@fs/${path.resolve(editorPath, 'style.css')}`)
    .split('{{source}}');
  const createHtml = (src: string) => htmlParts[0] + src + htmlParts[1];

  const resolvedEditorId = '\0virtual:editor';

  /**
   * Generate the editor entry module for a single project.
   *
   * Editor plugins are declared per-scene as module specifiers (e.g.
   * `'@revideo/2d/editor'`). We load them here, in the dev-server-only entry,
   * and inject them into the project before handing it to the editor. This
   * keeps the dynamic import — and the Vite-internal `/@id/` prefix used to
   * resolve it — out of `@revideo/core`, so it never leaks into a headless
   * render bundle.
   *
   * The real package versions (resolved from the installed `package.json`
   * files) are injected here too — they're only ever shown in the editor
   * footer, so this is the one place that has both the project and access to
   * the file system.
   */
  const editorEntry = (projectUrl: string) => {
    const versions = JSON.stringify(getVersions());
    /* language=typescript */
    return `\
import {editor} from '${editor}';
import project from '/@fs/${path.resolve(projectUrl)}';
const specifiers = [
  ...new Set((project.scenes ?? []).flatMap(scene => scene.plugins ?? [])),
];
const plugins = await Promise.all(
  specifiers.map(specifier =>
    import(/* @vite-ignore */ '/@id/' + specifier).then(mod => mod.default()),
  ),
);
editor({
  ...project,
  versions: ${versions},
  plugins: [...project.plugins, ...plugins],
});
`;
  };

  return {
    name: 'revideo:editor',

    async load(id) {
      const [, query] = id.split('?');

      if (id.startsWith(resolvedEditorId)) {
        if (projects.list.length === 1) {
          return editorEntry(projects.list[0].url);
        }

        if (query) {
          const params = new URLSearchParams(query);
          const name = params.get('project');
          if (name && projects.lookup.has(name)) {
            return editorEntry(projects.lookup.get(name)!.url);
          }
        }

        /* language=typescript */
        return `\
import {index} from '${editor}';
index(${JSON.stringify(projects.list)});
`;
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url) {
          const url = new URL(req.url, `http://${req.headers.host}`);
          if (url.pathname === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end(createHtml('/@id/__x00__virtual:editor'));
            return;
          }

          const name = url.pathname.slice(1);
          if (name && projects.lookup.has(name)) {
            res.setHeader('Content-Type', 'text/html');
            res.end(createHtml(`/@id/__x00__virtual:editor?project=${name}`));
            return;
          }
        }

        next();
      });
    },
  };
}
