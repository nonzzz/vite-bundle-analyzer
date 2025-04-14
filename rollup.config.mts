import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'

const external = [...builtinModules, 'vite']

export default defineConfig([
  {
    input: 'src/server/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external
  }
])
