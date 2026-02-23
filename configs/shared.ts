import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import type { Plugin as RolldownPlugin } from 'rolldown'
import type { Plugin as RollupPlugin } from 'rollup'

const defaultWD = process.cwd()

export const WASM_BINARY_PATH = path.join(defaultWD, 'zig-out', 'scan.wasm')

export const WASM_BINARY_B64 = fs.readFileSync(WASM_BINARY_PATH, 'base64')

export const NPM_OUTPUT_PATH = path.join(defaultWD, 'zig', 'dist')

export const WASM_INPUT_PATH = path.join(defaultWD, 'zig', 'index.ts')

export const external = [...builtinModules]

function definePlugin<Options, T extends RollupPlugin>(
  factory: (options?: Options) => T
): (options?: Options) => T
function definePlugin<Options, T extends RolldownPlugin>(
  factory: (options?: Options) => T
): (options?: Options) => T
function definePlugin<Options, T extends RollupPlugin | RolldownPlugin>(
  factory: (options?: Options) => T
): (options?: Options) => T {
  return factory
}

export const virtualWASM = definePlugin(() => ({
  name: 'wasm',
  transform(code) {
    if (code.includes('declare const b64: string')) {
      code = code.replace('declare const b64: string', `const b64 = \`${WASM_BINARY_B64}\``)
      return {
        code,
        map: { mappings: '' }
      }
    }
  }
}))

export const TS_ROLLDOWN_DEP_IGNORE_MSG =
  '// @ts-ignore If rolldown is not used, this import may cause a tsc error. We use `@ts-ignore` to suppress type checking.'

export const resolveTemplate = definePlugin(() => ({
  name: 'resolve-template',
  resolveId: {
    filter: { id: /html\.mjs$/ },
    handler() {
      return { id: './html.mjs', external: true }
    }
  }
}))

export const addTsIgnoreCommentForRolldown = definePlugin(() => ({
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
          if (file.includes('client')) {
            mod.code = mod.code.replace(
              /import\s+['"]zlib['"];/g,
              ''
            )
          }
        }
      }
    }
  }
}))
