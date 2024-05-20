import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stylex } from 'vite-plugin-stylex-dev'
import { viteMinify } from 'rollup-plugin-swc3'
import Icons from 'unplugin-icons/vite'
import type { UserConfig } from 'vite'

// Because esbuild can handle esm and cjs syntax
// so we using cjs require to import data.json
export default defineConfig(({ mode, command }) => {
  const base = <UserConfig>{
  
    plugins: [react(), stylex({ enableStylexExtend: true }), Icons({ compiler: 'jsx', jsx: 'react' }), viteMinify({ mangle: true, module: true, compress: true, sourceMap: true })],
    build: {
      outDir: path.join(process.cwd(), 'dist', 'client'),
      cssMinify: 'lightningcss',
      emptyOutDir: true
    },
    base: './'
  }
  if (mode === 'development') {
    const mock = require('./data.json')
    base.define = {
      'window.defaultSizes': JSON.stringify('stat'),
      'window.analyzeModule': JSON.stringify(mock)
    }
  }
  if (command === 'build') {
    base.resolve = {
      alias: [
        { find: 'react', replacement: 'preact/compat' },
        { find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
        { find: 'react-dom', replacement: 'preact/compat' },
        { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
      ]
    }
  }
  return base
})
