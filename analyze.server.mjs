import shim from '@rollup/plugin-esm-shim'
import { builtinModules } from 'module'
import { defineConfig } from 'rolldown'
import { minify, swc } from 'rollup-plugin-swc3'
import { adapter, analyzer } from './dist/index.mjs'

const external = [...builtinModules, 'vite']

export default defineConfig([
  {
    input: {
      cli: 'src/cli.ts',
      index: 'src/server/index.ts'
    },
    external,
    platform: 'node',
    output: [
      { dir: 'analysis', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'analysis', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      {
        name: 'resolve-template',
        resolveId(id) {
          if (id === 'html.mjs') {
            return { id: './dist/html.mjs' }
          }
        }
      },
      shim(),
      swc({ sourceMaps: true }),
      minify({ mangle: true, module: true, compress: true, sourceMap: true }),
      adapter(analyzer(), 'rolldown')
    ]
  }
])
