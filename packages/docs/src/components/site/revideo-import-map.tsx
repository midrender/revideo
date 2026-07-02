import fs from 'node:fs';
import path from 'node:path';

// Keep in sync with `basePath` in next.config.ts.
const BASE_PATH = '/revideo';

/**
 * Injects the import map that lets the interactive fiddles resolve
 * `import('@revideo/core')` / `import('@revideo/2d')` at runtime to the ESM
 * bundles copied into public/modules by scripts/copy-modules.mjs.
 */
export function RevideoImportMap() {
  let manifest: Record<string, string>;
  try {
    manifest = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'src', 'generated', 'modules.json'),
        'utf8',
      ),
    );
  } catch {
    // Without the manifest the fiddles cannot load the runtime; skip the
    // import map instead of failing the whole site.
    console.warn(
      'src/generated/modules.json is missing - run `npm run modules:copy` ' +
        'to enable the interactive fiddles.',
    );
    return null;
  }

  const importMap = {
    imports: {
      '@revideo/core': `${BASE_PATH}${manifest['@revideo/core']}`,
      '@revideo/2d': `${BASE_PATH}${manifest['@revideo/2d']}`,
      '@revideo/2d/jsx-runtime': `${BASE_PATH}${manifest['@revideo/2d']}`,
      '@lezer/javascript': 'https://esm.sh/@lezer/javascript',
    },
  };

  return (
    <script
      type="importmap"
      dangerouslySetInnerHTML={{__html: JSON.stringify(importMap)}}
    />
  );
}
