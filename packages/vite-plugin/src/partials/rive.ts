import * as fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import type {Plugin} from 'vite';

async function getRiveWasmPath() {
  try {
    const packageJsonPath = require.resolve(
      '@rive-app/canvas-advanced/package.json',
    );
    const packageDir = path.dirname(packageJsonPath);
    const wasmPath = path.join(packageDir, 'rive.wasm');

    await fs.promises.access(wasmPath, fs.constants.F_OK);

    return wasmPath;
  } catch (error) {
    console.error('Error finding Rive WASM file:', error);
    throw new Error('Could not find Rive WASM file', {cause: error});
  }
}

export function rivePlugin(): Plugin {
  return {
    name: 'revideo:rive-wasm',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url === '/@rive-wasm') {
          try {
            const wasmPath = await getRiveWasmPath();
            const file = await fs.promises.readFile(wasmPath);

            res.setHeader('Content-Type', 'application/wasm');
            Readable.from(file).pipe(res);
          } catch (error) {
            console.error('Error serving Rive WASM file:', error);
            res.statusCode = 500;
            res.end('Error serving Rive WASM file');
          }
          return;
        }
        next();
      });
    },
  };
}
