import commonjs from '@rollup/plugin-commonjs'
import shim from '@rollup/plugin-esm-shim'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'

const external = [...builtinModules, 'vite']

const env = process.env.NODE_ENV

export default defineConfig([
  {
    input: {
      cli: 'src/cli.ts',
      index: 'src/server/index.ts',
      server: 'src/sdk/server.ts'
    },
    external,
    output: [
      {
        dir: 'dist',
        format: 'esm',
        exports: 'named',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'server') {
            return 'sdk/[name].mjs'
          }
          return '[name].mjs'
        },
        chunkFileNames: '[name]-[hash].mjs'
      },
      {
        dir: 'dist',
        format: 'cjs',
        exports: 'named',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'server') {
            return 'sdk/[name].js'
          }
          return '[name].js'
        }
      }
    ],
    plugins: [
      commonjs(),
      nodeResolve(),
      {
        name: 'resolve-template',
        resolveId(id) {
          if (id === 'html.mjs') {
            return { id: './html.mjs', external: true }
          }
        }
      },
      shim(),
      swc(),
      env !== 'development' && minify({ mangle: true, module: true, compress: true, sourceMap: true })
    ]
  },
  {
    input: 'src/server/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external
  },
  {
    input: 'src/sdk/server.ts',
    output: { file: 'dist/sdk/server.d.ts' },
    plugins: [dts()]
  },
  {
    input: 'src/sdk/browser.tsx',
    output: { file: 'dist/sdk/browser.d.ts' },
    plugins: [dts()]
  }
])
