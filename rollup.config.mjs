import { nodeResolve } from '@rollup/plugin-node-resolve';

import { readFileSync } from 'node:fs';
const package_json = JSON.parse(readFileSync('./package.json'));

import replace from '@rollup/plugin-replace';
const replace_plugin = replace({
    values: {
        '___VERSION___': package_json.version
    },
    preventAssignment: true, // this is just to avoid a warning, that this will become the default option
});


export default [
  {
    input: 'tg.mjs',
    output: {
      file: 'dist/latest/tg.mjs',
      format: 'es',
    },
    plugins: [nodeResolve(), replace_plugin]
  }, {
    input: 'tg-plot.mjs',
    output: {
      file: 'dist/latest/tg-plot.mjs',
      format: 'es',
    },
    plugins: [nodeResolve(), replace_plugin]
  },
];