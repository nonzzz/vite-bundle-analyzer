import commonjs from '@rollup/plugin-commonjs'
import shim from '@rollup/plugin-esm-shim'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'

const external = [...builtinModules, 'vite']

const env = process.env.NODE_ENV

export default defineConfig([
  {
    input: {
      cli: 'src/cli.ts',
      index: 'src/server/index.ts'
    },
    external,
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      commonjs(),
      nodeResolve(),
      {
        name: 'resolve-template',
        resolveId(id) {
          if (id === 'html.mjs') {
            return { id: './html.mjs', external: true }
          }
        }
      },
      shim(),
      swc(),
      env !== 'development' && minify({ mangle: true, module: true, compress: true, sourceMap: true })
    ]
  },
  {
    input: 'src/server/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external
  }
])
