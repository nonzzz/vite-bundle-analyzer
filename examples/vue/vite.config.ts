import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VarletUIResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [VarletUIResolver()] }), analyzer({ analyzerMode: 'server', openAnalyzer: true })]
})
