import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from '../server'



export default defineConfig({
  plugins: [react(), analyzer()]
})
