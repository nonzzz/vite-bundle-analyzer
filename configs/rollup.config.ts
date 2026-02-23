import commonjs from '@rollup/plugin-commonjs'
import shim from '@rollup/plugin-esm-shim'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'
import { addTsIgnoreCommentForRolldown, external as _external, resolveTemplate, virtualWASM } from './shared'

const external = [..._external, 'vite', 'rolldown', 'rollup']

export default defineConfig([
  {
    input: {
      cli: 'src/cli.ts',
      index: 'src/server/index.ts'
    },
    external,
    output: [
      {
        dir: 'dist',
        format: 'esm',
        exports: 'named',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs'
      },
      {
        dir: 'dist',
        format: 'cjs',
        exports: 'named',
        entryFileNames: '[name].js'
      }
    ],
    plugins: [
      virtualWASM(),
      resolveTemplate(),
      commonjs(),
      nodeResolve(),
      shim(),
      swc(),
      minify({ mangle: true, module: true, compress: true, sourceMap: true })
    ]
  },
  {
    input: {
      index: 'src/server/index.ts',
      client: 'src/client/special/index.ts'
    },
    external,
    output: [
      { dir: 'dist', format: 'esm', entryFileNames: '[name].d.mts' },
      { dir: 'dist', format: 'cjs', entryFileNames: '[name].d.ts' }
    ],
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          composite: true,
          preserveSymlinks: false
        }
      }),
      addTsIgnoreCommentForRolldown()
    ]
  }
])
