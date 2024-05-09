import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stylex } from 'vite-plugin-stylex-dev'
import { minify as _minify } from 'rollup-plugin-swc3'
import Icons from 'unplugin-icons/vite'
import type { Plugin, UserConfig } from 'vite'

// Because esbuild can handle esm and cjs syntax
// so we using cjs require to import data.json
// minify should work after vite's internal build analyzer plugin.
function minify(): Plugin {
  const { name, renderChunk } = _minify({ mangle: true, module: true, compress: true })
  return { name, renderChunk: { order: 'post', handler: renderChunk as any } }
}

export default defineConfig(({ mode }) => {
  const base = <UserConfig>{
    resolve: {
      alias: [
        { find: 'react', replacement: 'preact/compat' },
        { find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
        { find: 'react-dom', replacement: 'preact/compat' },
        { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
      ]
    },
    plugins: [react(), stylex({ enableStylexExtend: true }), Icons({ compiler: 'jsx', jsx: 'react' }), minify()],
    build: {
      outDir: path.join(process.cwd(), 'dist', 'client'),
      minify: false,
      cssMinify: 'lightningcss',
      emptyOutDir: true
    },
    base: './'
  }
  if (mode === 'development') {
    const mock = require('./data.json')
    base.define = {
      'window.defaultSizes': JSON.stringify('stat'),
      'window.foamModule': JSON.stringify(mock)
    }
  }
  return base
})
