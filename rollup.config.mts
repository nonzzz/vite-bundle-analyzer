//  I won't consider rolldown dts plugin, isolation declaration isn't match for me.
// I have no time to change my code to fit with isolation declaration.
// I'll create a simple dts gen to my current need.
import commonjs from '@rollup/plugin-commonjs'
import shim from '@rollup/plugin-esm-shim'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import { dts } from 'rollup-plugin-dts'
import { minify, swc } from 'rollup-plugin-swc3'
const external = [...builtinModules, 'vite', 'rolldown', 'rollup']

const TS_ROLLDOWN_DEP_IGNORE_MSG =
  '// @ts-ignore If rolldown is not used, this import may cause a tsc error. We use `@ts-ignore` to suppress type checking.'

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
      {
        name: 'resolve-template',
        resolveId: {
          filter: { id: /html\.mjs$/ },
          handler() {
            return { id: './html.mjs', external: true }
          }
        }
      },
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
    external: [...external, '@rollup/pluginutils'],
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
      {
        name: 'add-ts-ignore-comment',
        generateBundle(_, bundle) {
          for (const file in bundle) {
            if (file.endsWith('.d.ts') || file.endsWith('.d.mts')) {
              const mod = bundle[file]
              if (mod.type === 'chunk') {
                const reg = /import\s+[^;]*\s+from\s+['"]rolldown['"]/g
                mod.code = mod.code.replace(reg, (match) => {
                  return TS_ROLLDOWN_DEP_IGNORE_MSG + '\n' + match
                })
              }
            }
          }
        }
      }
    ]
  }
])
