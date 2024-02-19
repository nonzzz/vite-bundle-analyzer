import path from 'path'
import type { ZlibOptions } from 'zlib'
import { createGzip, pick, slash, stringToByte } from './shared'
import { convertSourcemapToObject, getSourceMappings } from './source-map'
import type { Foam, OutputAsset, OutputBundle, OutputChunk, PluginContext } from './interface'

const KNOWN_EXT_NAME = ['.mjs', '.js', '.cjs', '.ts', '.tsx', '.vue', '.svelte']

type NodeKind = 'stat' | 'source'

const defaultWd = process.cwd()

function getAbsPath(p: string) {
  p = slash(p)
  return p.replace(defaultWd, '').replace(/\0/, '')
}

function lexPaths(p: string) {
  const dirs = p.split('/')
  if (dirs.length === 1) return dirs
  const paths: string[] = []
  const fileName = dirs.pop()!
  while (dirs.length) {
    const latest = dirs.shift()!
    paths.push(latest)
  }
  return [paths, fileName]
}

function generateNodeId(id: string): string {
  const abs = getAbsPath(id)
  return path.isAbsolute(abs) ? abs.replace('/', '') : abs
}

export class BaseNode {
  id: string
  label: string
  path: string
  // eslint-disable-next-line no-use-before-define
  pairs: Record<string, BaseNode>
  pairIds: Array<string>
  // eslint-disable-next-line no-use-before-define
  groups: Array<BaseNode>
  constructor(id: string) {
    this.id = id
    this.label = id
    this.path = id
    this.pairs = Object.create(null)
    this.groups = []
    this.pairIds = []
  }

  addPairsNode<T extends BaseNode>(key: string, node: T) {
    const currentPairs = this.pairs[key]
    if (currentPairs) return
    node.label = key
    node.path = key
    this.pairs[key] = node
    this.pairIds.push(key)
  }

  addPairs<T extends BaseNode>(node: T) {
    this.pairs[node.id] = node
    this.pairIds.push(node.id)
    return node
  }

  getChild(id: string) {
    return this.pairs[id]
  }
}

export class SourceNode extends BaseNode {
  parsedSize: number
  gzipSize: number
  constructor(id: string, parsedSize: number, gzipSize: number) {
    super(id)
    this.parsedSize = parsedSize
    this.gzipSize = gzipSize
  }
}

function createSourceNode(id: string, parsedSize: number, gzipSize: number) {
  return new SourceNode(generateNodeId(id), parsedSize, gzipSize)
}

export class StatNode extends BaseNode {
  statSize: number
  constructor(id: string, statSize: number) {
    super(id)
    this.statSize = statSize
  }
}

function createStatNode(id: string, statSize: number) {
  return new StatNode(generateNodeId(id), statSize)
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

export class AnalyzerNode extends BaseNode {
  originalId: string
  parsedSize: number
  mapSize: number
  statSize: number
  gzipSize: number
  source: Array<SourceNode>
  stats: Array<StatNode>
  pairs: Record<string, BaseNode>
  imports: Set<string>
  isAsset: boolean
  isEntry: boolean
  private currentNodeKind: NodeKind
  constructor(id: string, originalId: string) {
    super(id)
    this.originalId = originalId
    this.parsedSize = 0
    this.statSize = 0
    this.gzipSize = 0
    this.mapSize = 0
    this.source = []
    this.stats = []
    this.pairs = Object.create(null)
    this.imports = new Set()
    this.isAsset = true
    this.isEntry = false
    this.currentNodeKind = 'stat'
  }

  private processTreeNode(node: SourceNode | StatNode, nodeKind: NodeKind) {
    const paths = lexPaths(node.id)
    if (paths.length === 1) {
      this.addPairsNode(node.id, node)
      return
    }
    const [folders, fileName] = paths as [string[], string]
    let reference: BaseNode = this
    folders.forEach((folder) => {
      let childNode = reference.getChild(folder)
      if (!childNode) {
        childNode = reference.addPairs(nodeKind === 'stat' ? createStatNode(folder, 0) : createSourceNode(folder, 0, 0))
      }
      reference = childNode
    })
    if (fileName) {
      reference.addPairsNode(fileName, node)
    }
  }

  addImports(...imports: string[]) {
    imports.forEach((imp) => this.imports.add(imp))
  }

  async setup(bundle: WrappedChunk, pluginContext: PluginContext, compress: ReturnType<typeof createGzip>, workspaceRoot: string) {
    const { imports, dynamicImports, code, map, moduleIds } = bundle
    this.addImports(...imports, ...dynamicImports)
    this.gzipSize = (await compress(code)).byteLength
    this.parsedSize = code.byteLength
    this.mapSize = map.length

    // stats
    for (const moduleId of moduleIds) {
      const info = pluginContext.getModuleInfo(moduleId)
      if (info) {
        if (KNOWN_EXT_NAME.includes(path.extname(info.id)) || info.id.startsWith('\0')) {
          const node = createStatNode(info.id, new TextEncoder().encode(info.code ?? '').byteLength)
          this.statSize += node.statSize
          this.stats.push(node)
        }
      }
    }
    if (!this.statSize) {
      const result = await convertSourcemapToObject(map)
      for (const id in result) {
        const resolved = await pluginContext.resolve(id, this.originalId)
        if (resolved) {
          const node = createStatNode(resolved.id, new TextEncoder().encode(result[id]).byteLength)
          this.statSize += node.statSize
          this.stats.push(node)
        }
      }
    }

    // We use sourcemap to restore the corresponding chunk block
    const sources = await getSourceMappings(bundle.code, map, async (id: string) => {
      const relatived = path.relative(workspaceRoot, id)
      const resolved = await pluginContext.resolve(relatived)
      if (resolved) return resolved.id
      return path.join(workspaceRoot, relatived)
    })
    for (const id in sources) {
      const code = sources[id]
      const compressed = await compress(code)
      const parsedSize = stringToByte(code).byteLength
      const node = createSourceNode(id, parsedSize, compressed.byteLength)
      this.source.push(node)
    }
    if (!this.source.length) {
      this.source.push(createSourceNode(this.id, this.parsedSize, this.gzipSize))
    }
    this.currentNodeKind = 'stat'
    this.stats = this.prepareNestedNodes(this.stats, this.currentNodeKind) as StatNode[]
    this.currentNodeKind = 'source'
    this.source = this.prepareNestedNodes(this.source, this.currentNodeKind) as SourceNode[]
    this.isEntry = bundle.isEntry
  }

  private prepareNestedNodes(nodes: Array<StatNode | SourceNode>, kind: NodeKind) {
    while (nodes.length) {
      const current = nodes.shift()
      if (!current) break
      this.processTreeNode(current, kind)
    }
    this.walk(this, (node, parentNode) => {
      parentNode.groups.push(node)
    })
    // children is a temporay storage.
    return this.mergeFolder()
  }

  private walk(node: BaseNode, handler: (node: BaseNode, parent: BaseNode) => void) {
    if (!node.pairIds.length) return
    node.pairIds.forEach((id) => {
      if (id in node.pairs) {
        const reference = node.pairs[id]
        handler(reference, node)
        this.walk(reference, handler)
      }
    })
    node.pairIds = []
    node.pairs = {}
  }

  private mergeFolder(): SourceNode[] | StatNode[] {
    const mergeFolderImpl = (node: BaseNode): any => {
      if (!node.groups.length) {
        if (node instanceof StatNode) {
          return pick(node, ['id', 'path', 'label', 'statSize'])
        }
        if (node instanceof SourceNode) {
          return pick(node, ['id', 'path', 'label', 'parsedSize', 'gzipSize'])
        }
      }
      const groups = node.groups.map(mergeFolderImpl)
      if (groups.length === 1 && !path.extname(node.id)) {
        const merged = <StatNode | SourceNode>{}
        const childNode = groups[0]!
        merged.id = node.id
        merged.label = `${node.label}/${childNode.label}`
        merged.path = `${node.path}/${childNode.path}`
        if (node instanceof StatNode) {
          Object.assign(merged, pick(childNode, ['statSize', 'groups']))
          return merged
        }
        if (node instanceof SourceNode) {
          Object.assign(merged, pick(childNode, ['parsedSize', 'gzipSize', 'groups']))
          return merged
        }
      }
      if (this.currentNodeKind === 'stat') {
        const { statSize } = (groups as StatNode[]).reduce((acc, cur) => {
          acc.statSize += cur.statSize
          return acc
        }, { statSize: 0 })
        return { ...pick(node, ['id', 'path', 'label']), statSize, groups }
      }
      if (this.currentNodeKind === 'source') {
        const { parsedSize, gzipSize } = (groups as SourceNode[]).reduce((acc, cur) => {
          acc.parsedSize += cur.parsedSize
          acc.gzipSize += cur.gzipSize
          return acc
        }, { parsedSize: 0, gzipSize: 0 })
        return { ...pick(node, ['id', 'path', 'label']), parsedSize, gzipSize, groups }
      }
    }

    const result = this.groups.map(child => mergeFolderImpl(child))
    this.groups = []
    return result
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
        ['id', 'label', 'path', 'statSize', 'parsedSize', 'mapSize', 'gzipSize', 'source', 'stats', 'isAsset', 'isEntry']
      ),
      imports: Array.from(entrypointsMap[module.id] ?? [])
    })) as unknown as Foam[]
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
