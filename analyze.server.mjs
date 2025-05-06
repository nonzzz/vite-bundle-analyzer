//  I won't consider rolldown dts plugin, isolation declaration isn't match for me.
// I have no time to change my code to fit with isolation declaration.
// I'll create a simple dts gen to my current need.
import { builtinModules } from 'module'
import { defineConfig } from 'rolldown'
import { minify } from 'rollup-plugin-swc3'
import { analyzer, unstableRolldownAdapter } from './dist/index.mjs'
const external = [...builtinModules, 'vite']

export default defineConfig({
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
      resolveId: {
        filter: { id: /html\.mjs$/ },
        handler() {
          return { id: './html.mjs', external: true }
        }
      }
    },
    minify({ mangle: true, module: true, compress: true, sourceMap: true }),
    unstableRolldownAdapter(analyzer())
  ]
})
