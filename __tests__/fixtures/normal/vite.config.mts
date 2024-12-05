import viteReact from '@vitejs/plugin-react'
import path from 'path'
import url from 'url'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.dirname(url.fileURLToPath(import.meta.url)),
  plugins: [viteReact()]
})
