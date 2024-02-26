import minify from 'esbuild-minify-templates'
import type { Options } from 'tsup'

export const tsup: Options = {
  entry: ['src/server/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  shims: true,
  minify: true,
  esbuildPlugins: [minify.minifyTemplates(), minify.writeFiles()]
}
