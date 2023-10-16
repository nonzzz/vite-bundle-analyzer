import { Options } from 'tsup'

export const tsup: Options = {
  entry: ['src/server/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  esbuildOptions(options, { format }) {
    if (format === 'cjs') {
      options.define = {
        'import.meta.url': '__meta.url'
      }
    }
  },
  plugins: [{
    name: 'inject-meta',
    renderChunk(code) {
      if (/__meta.url/.test(code)) {
        return {
          code: `const __meta = /* @__PURE__ */{ url: require('url').pathToFileURL(__filename).href };\r\n${code}`
        }
      }
    }
  }]
}
