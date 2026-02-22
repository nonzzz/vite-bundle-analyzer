import { createFilter } from '@rollup/pluginutils'
import type { FilterPattern } from '@rollup/pluginutils'
import path from 'path'
import { scanImportStatements } from 'zig'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import type { Module, OutputAsset, OutputBundle, OutputChunk, PathFormatter, PluginContext } from './interface'
import { byteToString, createBrotil, createGzip, slash, stringToByte } from './shared'
import { calculateImportPath, pickupMappingsFromCodeStr } from './source-map'
import { Trie } from './trie'
import type { GroupWithNode, ImportedBy } from './trie'

const defaultWd = process.cwd()

function getAbsPath(p: string, cwd = defaultWd) {
  p = slash(p)
  return p.replace(cwd, '').replace(/\0/, '')
}

function generateNodeId(id: string, cwd: string = defaultWd): string {
  const abs = getAbsPath(id, cwd)
  return path.isAbsolute(abs) ? abs.replace('/', '') : abs
}

export interface AnalyzerModuleOptions {
  gzip?: ZlibOptions
  brotli?: BrotliOptions
  include?: FilterPattern
  exclude?: FilterPattern
  pathFormatter?: (path: string, defaultWD: string) => string
}

function findSourcemap(filename: string, sourcemapFileName: string, chunks: OutputBundle) {
  if (sourcemapFileName in chunks) { return ((chunks[sourcemapFileName] as OutputAsset).source) as string }
  throw new Error(`[analyzer error]: Missing sourcemap for ${filename}.`)
}

function isSoucemap(filename: string) {
  return filename.slice(-3) === 'map'
}

interface SerializedModWithAsset {
  code: string
  filename: string
  kind: 'asset'
}

interface SerializedModWithChunk {
  code: string
  filename: string
  map: string
  imports: string[]
  dynamicImports: string[]
  moduleIds: string[]
  isEntry: boolean
  kind: 'chunk'
}

type SerializedMod = SerializedModWithAsset | SerializedModWithChunk

export const JS_EXTENSIONS = /\.(c|m)?js$/

function serializedMod(mod: OutputChunk | OutputAsset, chunks: OutputBundle): SerializedMod {
  if (mod.type === 'asset' && !JS_EXTENSIONS.test(mod.fileName)) {
    return <SerializedModWithAsset> {
      code: mod.source,
      filename: mod.fileName,
      kind: 'asset'
    }
  }

  let sourcemap = ''
  if (JS_EXTENSIONS.test(mod.fileName)) {
    if ('sourcemapFileName' in mod) {
      if (mod.sourcemapFileName && mod.sourcemapFileName in chunks) {
        sourcemap = findSourcemap(mod.fileName, mod.sourcemapFileName, chunks)
      }
    }
    if (!sourcemap) {
      const possiblePath = mod.fileName + '.map'
      if (possiblePath in chunks) {
        sourcemap = findSourcemap(mod.fileName, possiblePath, chunks)
      }
    }
  }

  const code = mod.type === 'asset' ? mod.source : mod.code

  return <SerializedModWithChunk> {
    code,
    filename: mod.fileName,
    map: sourcemap,
    imports: mod.type === 'chunk' ? mod.imports : [],
    dynamicImports: mod.type === 'chunk' ? mod.dynamicImports : [],
    moduleIds: mod.type === 'chunk' ? Object.keys(mod.modules) : [],
    isEntry: mod.type === 'chunk' && mod.isEntry,
    kind: 'chunk'
  }
}

function createCompressAlorithm(opt: AnalyzerModuleOptions) {
  const { gzip, brotli } = opt
  return {
    gzip: createGzip(gzip),
    brotli: createBrotil(brotli)
  }
}

async function calcCompressedSize(b: Uint8Array, compress: ReturnType<typeof createCompressAlorithm>) {
  const [{ byteLength: gzipSize }, { byteLength: brotliSize }] = await Promise.all([
    compress.gzip(b),
    compress.brotli(b)
  ])
  return { gzipSize, brotliSize }
}

function uniq<T>(data: T[]) {
  return Array.from(new Set(data))
}

export function generateImportedBy(imports: string[], dynamicImports: string[]): ImportedBy[] {
  imports = [...uniq(imports)]
  dynamicImports = [...uniq(dynamicImports)]
  return [
    ...imports.map((id) => ({ id, kind: 'static' as const })),
    ...dynamicImports.map((id) => ({ id, kind: 'dynamic' as const }))
  ]
}

export class AnalyzerNode {
  originalId: string
  filename: string
  label: string
  parsedSize: number
  mapSize: number
  gzipSize: number
  brotliSize: number
  source: Array<GroupWithNode>
  imports: Set<string>
  isAsset: boolean
  isEntry: boolean
  constructor(originalId: string) {
    this.originalId = originalId
    this.filename = originalId
    this.label = originalId
    this.parsedSize = 0
    this.gzipSize = 0
    this.brotliSize = 0
    this.mapSize = 0
    this.source = []
    this.imports = new Set()
    this.isAsset = true
    this.isEntry = false
  }

  private addImports(...imports: string[]) {
    imports.forEach((imp) => this.imports.add(imp))
  }

  async setup(
    mod: SerializedMod,
    compress: ReturnType<typeof createCompressAlorithm>,
    workspaceRoot: string,
    matcher: ReturnType<typeof createFilter>,
    pathFormatter: PathFormatter
  ) {
    const sources = new Trie<{
      parsedSize: number,
      brotliSize: number,
      gzipSize: number,
      importedBy: ImportedBy[]
    }>({ meta: { gzipSize: 0, brotliSize: 0, parsedSize: 0, importedBy: [] } })

    if (mod.kind === 'asset') {
      const code = stringToByte(mod.code)
      this.parsedSize = code.byteLength
      const { brotliSize, gzipSize } = await calcCompressedSize(code, compress)
      this.brotliSize = brotliSize
      this.gzipSize = gzipSize
    } else {
      const { code, imports, dynamicImports, map } = mod

      this.addImports(...imports, ...dynamicImports)

      this.mapSize = map.length
      this.isEntry = mod.isEntry

      // maybe binay...
      const s = byteToString(code)

      // Check map again
      if (map) {
        // const chunkDir = path.dirname(path.resolve(workspaceRoot, mod.filename))
        // We use sourcemap to restore the corresponding chunk block
        // Don't using rollup context `resolve` function. If the relatived id is not live in rollup graph
        // It's will cause dead lock.(Altough this is a race case.)
        const { grouped: chunks, files } = pickupMappingsFromCodeStr(s, map)

        if (!files.size) {
          // maybe binary
          const imports = scanImportStatements(s)

          chunks[this.originalId] = {
            code: s,
            importedBy: generateImportedBy(
              imports.static.map((i) => calculateImportPath(this.originalId, i)),
              imports.dynamic.map((i) => calculateImportPath(this.originalId, i))
            )
          }
          files.add(this.originalId)
        }
        const validChunks = Object.entries(chunks)
          .filter(([id]) => matcher(id))

        await Promise.all(validChunks.map(async ([id, { code, importedBy }]) => {
          const b = stringToByte(code)
          const parsedSize = b.byteLength
          const compressedSizes = await calcCompressedSize(b, compress)

          sources.insert(pathFormatter(generateNodeId(id, workspaceRoot), workspaceRoot), {
            meta: { parsedSize, ...compressedSizes, importedBy }
          })
        }))
      }
    }

    sources.mergePrefixSingleDirectory()

    sources.walk(sources.root, {
      enter: (child, parent) => {
        if (parent) { parent.groups.push(child) }
      },
      leave: (child, _, end) => {
        if (child.groups && child.groups.length) {
          Object.assign(
            child,
            child.groups.reduce((acc, cur) => {
              acc.gzipSize += cur.gzipSize
              acc.brotliSize += cur.brotliSize
              acc.parsedSize += cur.parsedSize
              return acc
            }, { gzipSize: 0, brotliSize: 0, parsedSize: 0 })
          )
        }
        if (!end) {
          // @ts-expect-error no need this property
          delete child.importedBy
        }
      }
    })

    this.source = sources.root.groups

    // Fix correect size
    for (const s of this.source) {
      this.gzipSize += s.gzipSize
      this.brotliSize += s.brotliSize
      this.parsedSize += s.parsedSize
    }
  }
}

export class AnalyzerModule {
  compressAlorithm: ReturnType<typeof createCompressAlorithm>
  modules: AnalyzerNode[]
  workspaceRoot: string
  pluginContext: PluginContext | null
  private chunks: OutputBundle
  private matcher: ReturnType<typeof createFilter>
  private pathFormatter: (path: string, defaultWD: string) => string
  constructor(opt: AnalyzerModuleOptions = {}) {
    this.compressAlorithm = createCompressAlorithm(opt)
    this.modules = []
    this.pluginContext = null
    this.chunks = {}
    this.workspaceRoot = process.cwd()
    this.matcher = createFilter(opt.include, opt.exclude)
    this.pathFormatter = opt.pathFormatter || ((path: string) => path)
  }

  installPluginContext(context: PluginContext) {
    this.pluginContext = context
  }

  setupRollupChunks(chunks: OutputBundle, watchMode = false) {
    if (watchMode) {
      this.chunks = {}
      this.modules = []
    }
    // For multiple formats.
    Object.assign(this.chunks, chunks)
  }

  async addModule(mod: OutputChunk | OutputAsset) {
    if (isSoucemap(mod.fileName) || !this.matcher(mod.fileName)) { return }
    const serialized = serializedMod(mod, this.chunks)
    const node = new AnalyzerNode(serialized.filename)
    await node.setup(serialized, this.compressAlorithm, this.workspaceRoot, this.matcher, this.pathFormatter)
    this.modules.push(node)
  }

  processModule() {
    return this.modules.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { originalId: _, imports, ...rest } = m
      return { ...rest, imports: [...imports] }
    }) as Module[]
  }
}

export function createAnalyzerModule(opt: AnalyzerModuleOptions = {}) {
  return new AnalyzerModule(opt)
}
