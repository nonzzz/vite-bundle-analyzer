import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VarletUIResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { analyzer } from 'vite-bundle-analyzer'
import { cdn } from 'vite-plugin-cdn2'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [VarletUIResolver()] }), cdn({ modules: ['vue'] }), analyzer()]
})
