import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig } from 'rollup'
import type { Plugin } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'

const defaultWD = process.cwd()

const external = [...builtinModules]

const WASM_BINARY_PATH = path.join(defaultWD, 'zig-out', 'scan.wasm')

const WASM_INPUT_PATH = path.join(defaultWD, 'zig', 'index.ts')

const NPM_OUTPUT_PATH = path.join(defaultWD, 'zig', 'dist')

const WASM_BINARY_B64 = fs.readFileSync(WASM_BINARY_PATH, 'base64')

function virtualWASM(): Plugin {
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

export default defineConfig([
  {
    input: WASM_INPUT_PATH,
    external,
    output: [
      {
        dir: NPM_OUTPUT_PATH,
        format: 'es',
        exports: 'named',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs'
      },
      {
        dir: NPM_OUTPUT_PATH,
        format: 'cjs',
        exports: 'named',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js'
      }
    ],
    plugins: [virtualWASM(), swc()]
  },
  {
    input: WASM_INPUT_PATH,
    external,
    output: [
      { dir: NPM_OUTPUT_PATH, format: 'esm', entryFileNames: 'index.d.mts' },
      { dir: NPM_OUTPUT_PATH, format: 'cjs', entryFileNames: 'index.d.ts' }
    ],
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          composite: true,
          preserveSymlinks: false
        }
      })
    ]
  }
])
