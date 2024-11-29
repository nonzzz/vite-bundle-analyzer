import path from 'path'
import type { ZlibOptions } from 'zlib'
import ansis from 'ansis'
import { analyzerDebug, createGzip, slash, stringToByte } from './shared'
import { createFileSystemTrie } from './trie'
import type { ChunkMetadata, GroupWithNode, KindSource, KindStat } from './trie'
import { pickupContentFromSourcemap, pickupMappingsFromCodeBinary } from './source-map'
import type { Module, OutputAsset, OutputBundle, OutputChunk, PluginContext } from './interface'

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

interface WrappedChunk {
  code: Uint8Array
  imports: string[]
  dynamicImports: string[]
  moduleIds: string[]
  map: string
  filename: string
  isEntry: boolean
}

function findSourcemap(filename: string, sourcemapFileName: string, chunks: OutputBundle) {
  if (sourcemapFileName in chunks) return ((chunks[sourcemapFileName] as OutputAsset).source) as string
  throw new Error(`[analyzer error]: Missing sourcemap for ${filename}.`)
}

function wrapBundleChunk(bundle: OutputChunk | OutputAsset, chunks: OutputBundle, sourcemapFileName?: string) {
  const wrapped = <WrappedChunk> {}
  const isChunk = bundle.type === 'chunk'
  wrapped.code = stringToByte(isChunk ? bundle.code : bundle.source)
  wrapped.map = sourcemapFileName ? findSourcemap(bundle.fileName, sourcemapFileName, chunks) : isChunk ? bundle.map?.toString()! : ''
  wrapped.imports = isChunk ? bundle.imports : []
  wrapped.dynamicImports = isChunk ? bundle.dynamicImports : []
  wrapped.moduleIds = isChunk ? Object.keys(bundle.modules) : []
  wrapped.filename = bundle.fileName
  wrapped.isEntry = isChunk ? bundle.isEntry : false
  return wrapped
}

function printDebugLog(namespace: string, id: string, total: number) {
  analyzerDebug(`[${namespace}]: ${ansis.yellow(id)} find ${ansis.bold(ansis.green(total + ''))} relative modules.`)
}

export class AnalyzerNode {
  originalId: string
  filename: string
  label: string
  parsedSize: number
  mapSize: number
  statSize: number
  gzipSize: number
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

  async setup(bundle: WrappedChunk, pluginContext: PluginContext, compress: ReturnType<typeof createGzip>, workspaceRoot: string) {
    const { imports, dynamicImports, map, moduleIds } = bundle
    this.addImports(...imports, ...dynamicImports)
    this.mapSize = map.length
    this.isEntry = bundle.isEntry
    // stats
    // Why using moduleIds instead of modules because that rollup modules don't contain import declaration
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

    const stats = createFileSystemTrie<KindStat>({ meta: { statSize: 0 } })
    const sources = createFileSystemTrie<KindSource>({ kind: 'source', meta: { gzipSize: 0, parsedSize: 0 } })

    for (const info of infomations) {
      if (info.id[0] === '.') {
        info.id = path.resolve(workspaceRoot, info.id)
      }
      const statSize = stringToByte(info.code).byteLength
      this.statSize += statSize
      stats.insert(generateNodeId(info.id, workspaceRoot), { kind: 'stat', meta: { statSize } })
    }

    printDebugLog('stats', this.originalId, infomations.length)

    // Check map again

    if (!map) return

    // We use sourcemap to restore the corresponding chunk block
    // Don't using rollup context `resolve` function. If the relatived id is not live in rollup graph
    // It's will cause dead lock.(Altough this is a race case.)
    const { grouped: chunks, files } = pickupMappingsFromCodeBinary(bundle.code, map, (id: string) => {
      const relatived = path.relative(workspaceRoot, id)
      return path.join(workspaceRoot, relatived)
    })

    if (!files.size) {
      chunks[this.originalId] = bundle.code
      files.add(this.originalId)
    }

    for (const id in chunks) {
      if (!KNOWN_EXT_NAME.includes(path.extname(id))) continue
      const code = chunks[id]
      const b = stringToByte(code)
      const { byteLength: gzipSize } = await compress(b)
      const parsedSize = b.byteLength
      sources.insert(generateNodeId(id, workspaceRoot), { kind: 'source', meta: { gzipSize, parsedSize } })
    }

    printDebugLog('source', this.originalId, files.size)

    stats.mergePrefixSingleDirectory()
    stats.walk(stats.root, (c, p) => p.groups.push(c))
    sources.mergePrefixSingleDirectory()
    sources.walk(sources.root, (c, p) => p.groups.push(c))

    this.stats = stats.root.groups
    this.source = sources.root.groups
    // Fix correect size
    for (const s of this.source) {
      this.gzipSize += s.gzipSize
      this.parsedSize += s.parsedSize
    }
  }
}

function createAnalyzerNode(id: string) {
  return new AnalyzerNode(id)
}

export class AnalyzerModule {
  compress: ReturnType<typeof createGzip>
  modules: AnalyzerNode[]
  workspaceRoot: string
  pluginContext: PluginContext | null
  private chunks: OutputBundle
  constructor(opt?: ZlibOptions) {
    this.compress = createGzip(opt)
    this.modules = []
    this.pluginContext = null
    this.chunks = {}
    this.workspaceRoot = process.cwd()
  }

  installPluginContext(context: PluginContext) {
    if (this.pluginContext) return
    this.pluginContext = context
  }

  setupRollupChunks(chunks: OutputBundle) {
    // For multiple formats.
    Object.assign(this.chunks, chunks)
  }

  async addModule(bundle: OutputChunk | OutputAsset, sourcemapFileName?: string) {
    const wrapped = wrapBundleChunk(bundle, this.chunks, sourcemapFileName)
    if (!wrapped.map && !wrapped.moduleIds.length) return
    const node = createAnalyzerNode(wrapped.filename)
    await node.setup(wrapped, this.pluginContext!, this.compress, this.workspaceRoot)
    this.modules.push(node)
  }

  processModule() {
    return this.modules.map((m) => {
      const { originalId: _, imports, ...rest } = m
      return { ...rest, imports: [...imports] }
    }) as Module[]
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
