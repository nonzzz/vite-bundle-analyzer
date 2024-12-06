import { stylex } from '@stylex-extend/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteMinify } from 'rollup-plugin-swc3'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'
import mock from './data.json' with { type: 'json' }

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
    base.define = {
      'window.defaultSizes': JSON.stringify('stat'),
      'window.analyzeModule': JSON.stringify(mock)
    }
  }
  // For HMR in development (we won't use it)
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
