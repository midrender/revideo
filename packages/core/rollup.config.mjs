import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        // The package tsconfig emits declarations into lib/; the bundle only
        // needs plain JS routed to dist/.
        compilerOptions: {
          outDir: 'dist',
          declaration: false,
          declarationMap: false,
          incremental: false,
        },
      }),
      terser(),
    ],
  },
];
