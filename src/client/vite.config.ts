import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import style9 from 'style9/vite'
import { analyzer } from '../server'



export default defineConfig({
  plugins: [react(), style9(), analyzer()]
})
