import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'
import { NPM_OUTPUT_PATH, WASM_INPUT_PATH, external, virtualWASM } from './shared'

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
