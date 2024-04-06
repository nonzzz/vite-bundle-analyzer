import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stylexPlugin } from 'vite-plugin-stylex-dev'
import Icons from 'unplugin-icons/vite'
import type { UserConfig } from 'vite'

export default defineConfig(async ({ mode }) => {
  const base = <UserConfig>{
    resolve: {
      alias: [
        { find: 'react', replacement: 'preact/compat' },
        { find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
        { find: 'react-dom', replacement: 'preact/compat' },
        { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
      ]
    },
    plugins: [react(), stylexPlugin(), Icons({ compiler: 'jsx', jsx: 'react' })],
    build: {
      outDir: path.join(process.cwd(), 'dist', 'client'),
      minify: true,
      emptyOutDir: true
    },
    base: './'
  }
  if (mode === 'development') {
    const mock = await import('./data.json')
    base.define = {
      'window.defaultSizes': JSON.stringify('stat'),
      'window.foamModule': JSON.stringify(mock.default)
    }
  }
  return base
})
