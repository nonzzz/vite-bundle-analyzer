import fsp from 'fs/promises'
import { minifyHTMLLiterals } from 'minify-html-literals'
import type { Options } from 'tsup'

type Plugin = NonNullable<Options['esbuildPlugins']>[number]

// https://esbuild.github.io/content-types/#es5

function minifyTempalteLiteral(): Plugin {
  const filter = /\.[jt]s$/
  return {
    name: 'minifyHTMLLiterals',
    setup(build) {
      build.onLoad({ filter }, async ({ path }) => {
        const loader = path.match(/c?tsx?$/) ? 'ts' : 'js'
        const input = await fsp.readFile(path, 'utf8')
        const result = minifyHTMLLiterals(input, { fileName: path,
          shouldMinify(template) {
            return template.parts.some(part => part.text.includes('<!DOCTYPE'))
          } }) ?? undefined
        const contents = result && `${result.code}\n//# sourceMappingURL=${result.map?.toUrl()}`
        return {
          contents,
          loader
        }
      })
    }
  }
}

export const tsup: Options = {
  entry: ['src/server/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  shims: true,
  minify: true,
  esbuildPlugins: [minifyTempalteLiteral()],
  external: ['picocolors']
}
