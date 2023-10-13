import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import style9 from 'style9/vite'
import type { UserConfig } from 'vite'
import { analyzer } from '../server'



export default defineConfig(async ({ mode }) => {
  const base = <UserConfig>{
    plugins: [react(), style9({ fileName: 'style.css' }), analyzer({ analyzerMode: 'static' })],
    build: {
      outDir: path.join(process.cwd(), 'dist', 'client'),
      minify: false,
      emptyOutDir: true
    },
    base: './'
  }
  if (mode === 'development') {
    const mock = await import('./data.json')
    console.log(mock.default)
    base.define = {
      'window.defaultSizes': JSON.stringify('stat'),
      'window.foamModule': JSON.stringify(mock.default)
    }
  }
  return base
})
