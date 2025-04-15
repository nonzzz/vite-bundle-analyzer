import vue from '@vitejs/plugin-vue'
import { VarletUIResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [
    vue(),
    Components({ resolvers: [VarletUIResolver()] }) as Plugin,
    analyzer({ analyzerMode: 'server', openAnalyzer: false }) as Plugin
  ]
})
