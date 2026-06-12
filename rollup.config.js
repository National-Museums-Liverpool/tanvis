import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = process.env.BUILD === 'production';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/tanvis.iife.js',
    format: 'iife',
    name: 'Tanvis',
    sourcemap: true
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    production && terser()
  ].filter(Boolean)
};
