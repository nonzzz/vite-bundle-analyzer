import path from 'path'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import type { Module, OutputAsset, OutputBundle, OutputChunk, PluginContext } from './interface'
import { createBrotil, createGzip, slash, stringToByte } from './shared'
import { pickupContentFromSourcemap, pickupMappingsFromCodeBinary } from './source-map'
import { createFileSystemTrie } from './trie'
import type { ChunkMetadata, GroupWithNode, KindSource, KindStat } from './trie'

const KNOWN_EXT_NAME = ['.mjs', '.js', '.cjs', '.ts', '.tsx', '.vue', '.svelte', '.md', '.mdx']

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
}

function findSourcemap(filename: string, sourcemapFileName: string, chunks: OutputBundle) {
  if (sourcemapFileName in chunks) { return ((chunks[sourcemapFileName] as OutputAsset).source) as string }
  throw new Error(`[analyzer error]: Missing sourcemap for ${filename}.`)
}

function isSoucemap(filename: string) {
  return filename.slice(-3) === 'map'
}

interface SerializedModWithAsset {
  code: Uint8Array
  filename: string
  kind: 'asset'
}

interface SerializedModWithChunk {
  code: Uint8Array
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
  if (mod.type === 'asset') {
    return <SerializedModWithAsset> {
      code: stringToByte(mod.source),
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

  return <SerializedModWithChunk> {
    code: stringToByte(mod.code),
    filename: mod.fileName,
    map: sourcemap,
    imports: mod.imports,
    dynamicImports: mod.dynamicImports,
    moduleIds: Object.keys(mod.modules),
    isEntry: mod.isEntry,
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

export class AnalyzerNode {
  originalId: string
  filename: string
  label: string
  parsedSize: number
  mapSize: number
  statSize: number
  gzipSize: number
  brotliSize: number
  source: Array<GroupWithNode>
  stats: Array<GroupWithNode>
  imports: Set<string>
  isAsset: boolean
  isEntry: boolean
  constructor(originalId: string) {
    this.originalId = originalId
    this.filename = originalId
    this.label = originalId
    this.parsedSize = 0
    this.statSize = 0
    this.gzipSize = 0
    this.brotliSize = 0
    this.mapSize = 0
    this.source = []
    this.stats = []
    this.imports = new Set()
    this.isAsset = true
    this.isEntry = false
  }

  private addImports(...imports: string[]) {
    imports.forEach((imp) => this.imports.add(imp))
  }

  async setup(
    mod: SerializedMod,
    pluginContext: PluginContext,
    compress: ReturnType<typeof createCompressAlorithm>,
    workspaceRoot: string
  ) {
    const stats = createFileSystemTrie<KindStat>({ meta: { statSize: 0 } })
    const sources = createFileSystemTrie<KindSource>({ kind: 'source', meta: { gzipSize: 0, brotliSize: 0, parsedSize: 0 } })

    if (mod.kind === 'asset') {
      stats.insert(generateNodeId(mod.filename, workspaceRoot), { kind: 'stat', meta: { statSize: mod.code.byteLength } })
      sources.insert(generateNodeId(mod.filename, workspaceRoot), {
        kind: 'source',
        meta: { parsedSize: mod.code.byteLength, ...(await calcCompressedSize(mod.code, compress)) }
      })
      this.statSize = mod.code.byteLength
    } else {
      const { code, imports, dynamicImports, map, moduleIds } = mod

      this.addImports(...imports, ...dynamicImports)

      this.mapSize = map.length
      this.isEntry = mod.isEntry

      const infomations = moduleIds.length
        ? moduleIds.reduce((acc, cur) => {
          const info = pluginContext.getModuleInfo(cur)
          if (info && info.code) {
            if (KNOWN_EXT_NAME.includes(path.extname(info.id)) || info.id.startsWith('\0')) {
              acc.push({ id: info.id, code: info.code })
            }
          }
          return acc
        }, [] as Array<ChunkMetadata>)
        : pickupContentFromSourcemap(map)

      for (const info of infomations) {
        if (info.id[0] === '.') {
          info.id = path.resolve(workspaceRoot, info.id)
        }
        const statSize = stringToByte(info.code).byteLength
        this.statSize += statSize
        stats.insert(generateNodeId(info.id, workspaceRoot), { kind: 'stat', meta: { statSize } })
      }

      // Check map again
      if (map) {
        // We use sourcemap to restore the corresponding chunk block
        // Don't using rollup context `resolve` function. If the relatived id is not live in rollup graph
        // It's will cause dead lock.(Altough this is a race case.)
        const { grouped, files } = pickupMappingsFromCodeBinary(code, map, (id: string) => {
          const relatived = path.relative(workspaceRoot, id)
          return path.join(workspaceRoot, relatived)
        })

        const chunks: Record<string, Uint8Array | string> = grouped

        if (!files.size) {
          chunks[this.originalId] = code
          files.add(this.originalId)
        }

        for (const id in chunks) {
          if (!KNOWN_EXT_NAME.includes(path.extname(id))) { continue }
          const code = chunks[id]
          const b = stringToByte(code)
          const parsedSize = b.byteLength
          sources.insert(generateNodeId(id, workspaceRoot), {
            kind: 'source',
            meta: { parsedSize, ...(await calcCompressedSize(b, compress)) }
          })
        }
      }
    }

    stats.mergePrefixSingleDirectory()
    stats.walk(stats.root, (c, p) => p.groups.push(c))
    sources.mergePrefixSingleDirectory()
    sources.walk(sources.root, (c, p) => p.groups.push(c))

    this.stats = stats.root.groups
    this.source = sources.root.groups
    // Fix correect size
    for (const s of this.source) {
      this.gzipSize += s.gzipSize
      this.brotliSize += s.brotliSize
      this.parsedSize += s.parsedSize
    }
  }
}

function createAnalyzerNode(id: string) {
  return new AnalyzerNode(id)
}

export class AnalyzerModule {
  compressAlorithm: ReturnType<typeof createCompressAlorithm>
  modules: AnalyzerNode[]
  workspaceRoot: string
  pluginContext: PluginContext | null
  private chunks: OutputBundle
  constructor(opt: AnalyzerModuleOptions = {}) {
    this.compressAlorithm = createCompressAlorithm(opt)
    this.modules = []
    this.pluginContext = null
    this.chunks = {}
    this.workspaceRoot = process.cwd()
  }

  installPluginContext(context: PluginContext) {
    if (this.pluginContext) { return }
    this.pluginContext = context
  }

  setupRollupChunks(chunks: OutputBundle) {
    // For multiple formats.
    Object.assign(this.chunks, chunks)
  }

  async addModule(mod: OutputChunk | OutputAsset) {
    if (isSoucemap(mod.fileName)) { return }
    const serialized = serializedMod(mod, this.chunks)
    const node = createAnalyzerNode(serialized.filename)
    await node.setup(serialized, this.pluginContext!, this.compressAlorithm, this.workspaceRoot)
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
