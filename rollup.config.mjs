import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'tg.mjs',
  output: {
    file: 'dist/tg.mjs',
    format: 'es',
  },
  plugins: [nodeResolve()]
};