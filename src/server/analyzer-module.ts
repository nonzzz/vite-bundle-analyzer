import path from 'path'
import type { ZlibOptions } from 'zlib'
import { createGzip, pick, slash, stringToByte } from './shared'
import { createFileSystemTrie } from './trie'
import type { ChunkMetadata, GroupWithNode, KindSource, KindStat } from './trie'
import { convertSourcemapToContents, getSourceMappings } from './source-map'
import type { Foam, OutputAsset, OutputBundle, OutputChunk, PluginContext } from './interface'

const KNOWN_EXT_NAME = ['.mjs', '.js', '.cjs', '.ts', '.tsx', '.vue', '.svelte', '.md', '.mdx']

const defaultWd = process.cwd()

const encoder = new TextEncoder()

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
  imports: string[],
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

function wrapBundleChunk(bundle: OutputChunk | OutputAsset, chunks: OutputBundle, sourcemapFileName: string) {
  const wrapped = <WrappedChunk>{}
  const isChunk = bundle.type === 'chunk' 
  wrapped.code = stringToByte(isChunk ? bundle.code : bundle.source)
  wrapped.map = findSourcemap(bundle.fileName, sourcemapFileName, chunks)
  wrapped.imports = isChunk ? bundle.imports : []
  wrapped.dynamicImports = isChunk ? bundle.dynamicImports : []
  wrapped.moduleIds = isChunk ? bundle.moduleIds : []
  wrapped.filename = bundle.fileName
  wrapped.isEntry = isChunk ? bundle.isEntry : false
  return wrapped
}

export class AnalyzerNode {
  originalId: string
  id: string
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
  constructor(id: string, originalId: string) {
    this.originalId = originalId
    this.id = originalId
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

  private traverse(nodes: Array<GroupWithNode>, handler: (node: GroupWithNode) => void) {
    for (const node of nodes) {
      if (node.groups && node.groups.length) {
        this.traverse(node.groups, handler)
        handler(node)
      } 
      if (node.groups && node.groups.length === 0) {
        delete (node as any).groups
      }
    }
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
      : await convertSourcemapToContents(map)

    const stats = createFileSystemTrie<KindStat>({ meta: { statSize: 0 } })
    const sources = createFileSystemTrie<KindSource>({ kind: 'source', meta: { gzipSize: 0, parsedSize: 0 } })
    
    for (const info of infomations) {
      if (info.id[0] === '.') {
        const resolved = await pluginContext.resolve(info.id, this.originalId)
        if (!resolved) continue
        info.id = resolved.id
      }
      const statSize = encoder.encode(info.code).byteLength
      this.statSize += statSize
      stats.insert(generateNodeId(info.id, workspaceRoot), { kind: 'stat', meta: { statSize } })
    }

    // We use sourcemap to restore the corresponding chunk block
    const chunks = await getSourceMappings(bundle.code, map, async (id: string) => {
      const relatived = path.relative(workspaceRoot, id)
      const resolved = await pluginContext.resolve(relatived)
      if (resolved) return resolved.id
      return path.join(workspaceRoot, relatived)
    })

    for (const id in chunks) {
      const code = chunks[id]
      const b = stringToByte(code)
      const { byteLength: gzipSize } = await compress(b)
      const parsedSize = b.byteLength
      sources.insert(generateNodeId(id, workspaceRoot), { kind: 'source', meta: { gzipSize, parsedSize } })
    }

    stats.mergePrefixSingleDirectory()
    stats.walk(stats.root, (id, n, p) => {
      const { meta, groups } = pick(n, ['groups', 'meta'])
      p.groups.push({ id, label: id, ...meta, groups })
    })

    sources.mergePrefixSingleDirectory()
    sources.walk(sources.root, (id, n, p) => {
      const { meta, groups } = pick(n, ['groups', 'meta'])
      p.groups.push({ id, label: id, ...meta, groups })
    })
    this.traverse(stats.root.groups, (node) => {
      node.statSize = node.groups.reduce((acc, cur) => acc + cur.statSize, 0)
    })
    this.traverse(sources.root.groups, (node) => {
      const size = node.groups.reduce((acc, cur) => {
        acc.parsedSize += cur.parsedSize
        acc.gzipSize += cur.gzipSize
        return acc
      }, { parsedSize: 0, gzipSize: 0 })
      Object.assign(node, size)
    })
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
  return new AnalyzerNode(generateNodeId(id), id)
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
    this.chunks = chunks
  }

  async addModule(bundle: OutputChunk | OutputAsset, sourcemapFileName: string) {
    const wrapped = wrapBundleChunk(bundle, this.chunks, sourcemapFileName)
    const node = createAnalyzerNode(wrapped.filename)
    await node.setup(wrapped, this.pluginContext!, this.compress, this.workspaceRoot)
    this.modules.push(node)
  }

  processFoamModule() {
    // We only consider top layer entryPointer
    const findEntrypointsRelatedNodes = (nodes: AnalyzerNode[]): Record<string, Set<string>> => {
      const mapImports = (entry: AnalyzerNode, exclude: string[] = []): AnalyzerNode[] => {
        const processed = [...entry.imports].flatMap(id => this.modules
          .filter(foam => !exclude.includes(foam.id) && foam.id === generateNodeId(id)))
        const newExclude = processed.map(foam => foam.id).concat(exclude)
        return processed.flatMap(foam => mapImports(foam, newExclude)).concat(processed)
      }

      return nodes.filter(node => node.isEntry)
        .reduce((acc, entry) => {
          mapImports(entry).forEach(relative => {
            if (!acc[relative.id]) {
              acc[relative.id] = new Set()
            }
            acc[relative.id].add(entry.id)
          })
          return acc
        }, {} as Record<string, Set<string>>)
    }
    const entrypointsMap = findEntrypointsRelatedNodes(this.modules)
    return this.modules.map((module) => ({
      ...pick(
        module,
        ['id', 'label', 'statSize', 'parsedSize', 'mapSize', 'gzipSize', 'source', 'stats', 'isAsset', 'isEntry']
      ),
      imports: Array.from(entrypointsMap[module.id] ?? [])
    })) as unknown as Foam[]
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
