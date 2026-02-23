import { defineConfig } from 'rolldown'
import { minify } from 'rollup-plugin-swc3'
import { analyzer, unstableRolldownAdapter } from '../dist/index.mjs'
import { external as _external, resolveTemplate, virtualWASM } from './shared'

const external = [..._external, 'vite']

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
    resolveTemplate(),
    minify({ mangle: true, module: true, compress: true, sourceMap: true }),
    unstableRolldownAdapter(analyzer({ exclude: [/\.mjs$/], openAnalyzer: true, analyzerMode: 'static' }))
  ]
})
