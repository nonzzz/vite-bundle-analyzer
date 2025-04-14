import shim from '@rollup/plugin-esm-shim'
import { builtinModules } from 'module'
import { defineConfig } from 'rolldown'
import type { RolldownPlugin } from 'rolldown'
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
    platform: 'node',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      {
        name: 'resolve-template',
        resolveId(id) {
          if (id === 'html.mjs') {
            return { id: './html.mjs', external: true }
          }
        }
      },
      shim() as RolldownPlugin,
      swc() as RolldownPlugin,
      env !== 'development' && minify({ mangle: true, module: true, compress: true, sourceMap: true }) as RolldownPlugin
    ]
  }
])
