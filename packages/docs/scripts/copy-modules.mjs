/**
 * Copies the ESM bundles of @revideo/core and @revideo/2d into public/modules
 * so the interactive fiddles can import them at runtime through the import
 * map injected in src/app/layout.tsx.
 *
 * The bundles are produced by `rollup -c rollup.config.mjs` in each package
 * (`npm run core:bundle` / `npm run 2d:bundle` at the repo root). When a
 * bundle is missing, this script builds it first.
 */
import {execSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const docsRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.join(docsRoot, '..', '..');
const modulesDir = path.join(docsRoot, 'public', 'modules');
const manifestPath = path.join(docsRoot, 'src', 'generated', 'modules.json');

const packages = [
  {name: 'core', specifier: '@revideo/core', buildScript: 'core:build'},
  {name: '2d', specifier: '@revideo/2d', buildScript: '2d:build'},
];

// The fiddle components import @revideo/core and @revideo/2d types, which
// resolve to each package's lib/ output. Build them when missing so the docs
// type-check passes in a fresh checkout.
for (const {name, buildScript} of packages) {
  const libIndex = path.join(repoRoot, 'packages', name, 'lib', 'index.d.ts');
  if (!fs.existsSync(libIndex)) {
    console.log(`Type output for '${name}' is missing, building it...`);
    execSync(`npm run ${buildScript}`, {cwd: repoRoot, stdio: 'inherit'});
  }
}

fs.rmSync(modulesDir, {recursive: true, force: true});
fs.mkdirSync(modulesDir, {recursive: true});
fs.mkdirSync(path.dirname(manifestPath), {recursive: true});

const manifest = {};
for (const {name, specifier} of packages) {
  const bundlePath = path.join(repoRoot, 'packages', name, 'dist', 'index.js');
  if (!fs.existsSync(bundlePath)) {
    console.log(`Bundle for '${name}' is missing, building it...`);
    execSync(`npm run bundle -w packages/${name}`, {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }

  let contents = fs.readFileSync(bundlePath, 'utf8');
  const hash = crypto
    .createHash('md5')
    .update(contents)
    .digest('hex')
    .slice(0, 8);
  const fileName = `${name}-${hash}.js`;

  const mapPath = `${bundlePath}.map`;
  if (fs.existsSync(mapPath)) {
    contents = contents.replace(
      /\/\/# sourceMappingURL=index\.js\.map\s*$/,
      `//# sourceMappingURL=${fileName}.map\n`,
    );
    fs.copyFileSync(mapPath, path.join(modulesDir, `${fileName}.map`));
  }

  fs.writeFileSync(path.join(modulesDir, fileName), contents);
  manifest[specifier] = `/modules/${fileName}`;
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Copied revideo module bundles:', manifest);
