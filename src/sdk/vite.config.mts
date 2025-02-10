import { stylex } from '@stylex-extend/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteMinify } from 'rollup-plugin-swc3'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    stylex(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    viteMinify({ mangle: true, module: true, compress: true, sourceMap: true })
  ],
  build: {
    modulePreload: false,
    cssMinify: 'lightningcss',
    outDir: path.join(process.cwd(), 'dist', 'sdk'),
    lib: {
      entry: path.join(process.cwd(), 'src/sdk/browser.tsx'),
      formats: ['es', 'cjs'],
      fileName: (format) => `browser.${format === 'es' ? 'mjs' : 'js'}`,
      cssFileName: 'browser'
    }
  },
  resolve: {
    alias: [
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
    ]
  }
})
