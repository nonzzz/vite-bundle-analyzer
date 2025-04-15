import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'

const external = [...builtinModules, 'vite']

export default defineConfig([
  {
    input: 'src/server/index.ts',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].d.mts' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].d.ts' }
    ],
    plugins: [dts()],
    external
  }
])
