import path from 'path'
import type { ZlibOptions } from 'zlib'
import { SourceMapConsumer } from 'source-map'
import { createGzip, pick, slash } from './shared'
import type { Foam, OutputChunk, PluginContext } from './interface'

const defaultWd = slash(process.cwd())

type NodeKind = 'stat' | 'source'

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

async function getSourceMapContent(code: string, sourceMap: any) {
  const modules: Record<string, string> = {}
  if (!sourceMap) return {}
  await SourceMapConsumer.with(sourceMap, null, consumer => {
    let line = 1
    let column = 0
    for (let i = 0; i < code.length; i++, column++) {
      const { source } = consumer.originalPositionFor({
        line,
        column
      })
      if (source) {
        const id = source.replace(/\.\.\//g, '')
        if (id in modules) {
          modules[id] += code[i]
        } else {
          modules[id] = code[i]
        }
      }
      if (code[i] === '\n') {
        line += 1
        column = -1
      }
    }
  })
  return modules
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

export class AnalyzerNode extends BaseNode {
  parsedSize: number
  statSize: number
  gzipSize: number
  source: Array<SourceNode>
  stats: Array<StatNode>
  pairs: Record<string, BaseNode>
  imports: Set<string>
  isAsset: boolean
  isEntry: boolean
  private currentNodeKind: NodeKind
  constructor(id: string) {
    super(id)
    this.parsedSize = 0
    this.statSize = 0
    this.gzipSize = 0
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

  async setup(bundle: OutputChunk, pluginContext: PluginContext, compress: ReturnType<typeof createGzip>) {
    const modules = bundle.modules
    const code = Buffer.from(bundle.code, 'utf8')
    const compressed = await compress(code)
    this.gzipSize = compressed.byteLength
    this.parsedSize = code.byteLength
    const source = await getSourceMapContent(bundle.code, bundle.map)
    for (const moduleId in modules) {
      const info = pluginContext.getModuleInfo(moduleId)
      if (!info) continue
      const { id } = info
      if (/\.(mjs|js|ts|vue|jsx|tsx|svelte)(\?.*|)$/.test(id) || id.startsWith('\0')) {
        const node = createStatNode(id, modules[moduleId].originalLength)
        this.statSize += node.statSize
        this.stats.push(node)
      }
    }
    // Handle the virtual moudle (For some reason we can only merge these chunks)
    // Then handle the rest
    const virtuals = bundle.moduleIds.filter(m => m.startsWith('\0'))
    const fullModuleCalc = { parsedSize: 0 }
    for (const sourceId in source) {
      if (!bundle.moduleIds.length) continue
      const matched = bundle.moduleIds.find(id => id.match(sourceId))
      if (matched) {
        const code = Buffer.from(source[sourceId], 'utf8')
        const result = await compress(code)
        fullModuleCalc.parsedSize += code.byteLength
        this.source.push(createSourceNode(matched, code.byteLength, result.byteLength))
      }
    }
    if (virtuals.length > 0) {
      const { code } = bundle
      const sourceId = bundle.map!.sources[0]
      if (sourceId) {
        let restCode: Buffer | null = null
        await SourceMapConsumer.with(bundle.map! as any, null, consumer => {
          let line = 1
          let column = 0
          for (let i = 0; i < code.length; i++, column++) {
            const { source } = consumer.originalPositionFor({
              line,
              column
            })
            if (source === sourceId) {
              restCode = Buffer.from(code.substring(0, column), 'utf8')
              break
            }
            if (code[i] === '\n') {
              line += 1
              column = -1
            }
          }
        })
        const restCompressed = restCode ? (await compress(restCode)).byteLength : 0
        this.source.push(createSourceNode('\0virtual-chunks', this.parsedSize - fullModuleCalc.parsedSize, restCompressed))
      }
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
  return new AnalyzerNode(generateNodeId(id))
}

export class AnalyzerModule {
  compress: ReturnType<typeof createGzip>
  modules: AnalyzerNode[]
  pluginContext: PluginContext | null
  constructor(opt?: ZlibOptions) {
    this.compress = createGzip(opt)
    this.modules = []
    this.pluginContext = null
  }

  installPluginContext(context: PluginContext) {
    if (this.pluginContext) return 
    this.pluginContext = context
  }

  async addModule(bundleName: string, bundle: OutputChunk) {
    const node = createAnalyzerNode(bundleName)
    node.addImports(...bundle.imports, ...bundle.dynamicImports)
    await node.setup(bundle, this.pluginContext!, this.compress)
    this.modules.push(node)
  }

  processFoamModule() {
    // We only consider top layer entryPointer
    const findEntrypointsRelatedNodes = (nodes: AnalyzerNode[]) => {
      const entries = nodes.filter(node => node.isEntry)
      const entrypointsMap: Record<string, Set<string>> = {}
  
      const mapImports = (entry: AnalyzerNode, exclude: string[] = []) => {
        const processed: AnalyzerNode[] = []
        for (const id of entry.imports) {
          const foam = nodes.find(node => !exclude.includes(node.id) && node.id === generateNodeId(id))
          if (foam) {
            processed.push(foam)
            const newExclude = [...exclude, foam.id]
            const imports = mapImports(foam, newExclude)
            processed.push(...imports)
          }
        }
        return processed
      }
  
      for (const entry of entries) {
        const imports = mapImports(entry)
        imports.forEach(relative => {
          if (!entrypointsMap[relative.id]) {
            entrypointsMap[relative.id] = new Set()
          }
          entrypointsMap[relative.id].add(entry.id)
        })
      }
  
      return entrypointsMap
    }
    const entrypointsMap = findEntrypointsRelatedNodes(this.modules)
    return this.modules.map((module) => ({ ...pick(module, ['id', 'label', 'path', 'statSize', 'parsedSize', 'gzipSize', 'source', 'stats', 'isAsset', 'isEntry']), 
      imports: Array.from(entrypointsMap[module.id] ?? []) })) as unknown as Foam[]
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
