import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import style9 from 'style9/vite'
import { analyzer } from '../server'



export default defineConfig({
  plugins: [react(), style9({ fileName: 'style.css' }), analyzer()],
  build: {
    outDir: path.join(process.cwd(), 'dist', 'client'),
    minify: false,
    emptyOutDir: true
  },
  base: './'
})
