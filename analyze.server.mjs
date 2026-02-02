//  I won't consider rolldown dts plugin, isolation declaration isn't match for me.
// I have no time to change my code to fit with isolation declaration.
// I'll create a simple dts gen to my current need.
import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig } from 'rolldown'
import { minify } from 'rollup-plugin-swc3'
import { analyzer, unstableRolldownAdapter } from './dist/index.mjs'
const external = [...builtinModules, 'vite']

const defaultWD = process.cwd()

const WASM_BINARY_PATH = path.join(defaultWD, 'zig-out', 'scan.wasm')

const WASM_BINARY_B64 = fs.readFileSync(WASM_BINARY_PATH, 'base64')

function virtualWASM() {
  return {
    name: 'wasm',
    transform(code) {
      if (code.includes('declare const b64: string')) {
        code = code.replace('declare const b64: string', `const b64 = \`${WASM_BINARY_B64}\``)
        return {
          code,
          map: { mappings: '' }
        }
      }
    }
  }
}

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
    virtualWASM(),
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
    unstableRolldownAdapter(analyzer({ exclude: [/\.mjs$/], openAnalyzer: true, analyzerMode: 'static' }))
  ]
})
