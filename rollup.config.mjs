import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'tg.mjs',
    output: {
      file: 'dist/tg.mjs',
      format: 'es',
    },
    plugins: [nodeResolve()]
  }, {
    input: 'tg-plot.mjs',
    output: {
      file: 'dist/tg-plot.mjs',
      format: 'es',
    },
    plugins: [nodeResolve()]
  },
];