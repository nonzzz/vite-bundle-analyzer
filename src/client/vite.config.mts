import path from 'path'
import { createRequire } from 'module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stylex } from '@stylex-extend/vite'
import { viteMinify } from 'rollup-plugin-swc3'
import Icons from 'unplugin-icons/vite'
import type { UserConfig } from 'vite'

const _require = createRequire(import.meta.url)

export default defineConfig(({ mode, command }) => {
  const base = {
    plugins: [
      react(),
      stylex(),
      Icons({ compiler: 'jsx', jsx: 'react' }),
      viteMinify({ mangle: true, module: true, compress: true, sourceMap: true })
    ],
    build: {
      outDir: path.join(process.cwd(), 'dist', 'client'),
      cssMinify: 'lightningcss',
      emptyOutDir: true,
      modulePreload: false
    },
    base: './'
  } as UserConfig
  if (mode === 'development') {
    const mock = _require('./data.json')
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
