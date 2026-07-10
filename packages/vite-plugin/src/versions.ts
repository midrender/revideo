import fs from 'fs';
import path from 'path';

export function getVersions() {
  return {
    core: loadVersion('@revideo/core'),
    two: loadVersion('@revideo/2d'),
    ui: loadVersion('@revideo/ui'),
    vitePlugin: loadVersion('@revideo/vite-plugin'),
  };
}

function loadVersion(module: string): string | null {
  try {
    const modulePath = path.dirname(require.resolve(`${module}/package.json`));
    const packageJsonPath = path.resolve(modulePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());
    return packageJson.version ?? null;
  } catch (_) {
    return null;
  }
}
