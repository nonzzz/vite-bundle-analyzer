import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import shim from '@rollup/plugin-esm-shim'
import pkg from './package.json' assert { type: 'json' }

const external = [...Object.keys(pkg.dependencies), ...builtinModules]

export default defineConfig([
  {
    input: 'src/server/index.ts',
    external,
    output: [
      { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
      { file: 'dist/index.js', format: 'cjs', exports: 'named' }
    ],
    plugins: [
      nodeResolve(),
      shim(),
      swc(),
      minify({ mangle: true, module: true, compress: true, sourceMap: true })
    ]
  },
  {
    input: 'src/server/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external
  }
])
