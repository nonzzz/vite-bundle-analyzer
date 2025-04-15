import { builtinModules } from 'module'
import { defineConfig } from 'rolldown'
import type { RolldownPlugin } from 'rolldown'
import { minify } from 'rollup-plugin-swc3'
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
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [
      {
        name: 'resolve-template',
        resolveId: {
          filter: { id: { include: ['html.mjs'] } },
          handler() {
            return { id: './html.mjs', external: true }
          }
        }
      },
      minify({ mangle: true, module: true, compress: true, sourceMap: true }) as RolldownPlugin
    ]
  }
])
