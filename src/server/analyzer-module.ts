import path from 'path'
import type { ZlibOptions } from 'zlib'
import { createGzip, pick, slash } from './shared'
import type { Foam, OutputChunk, RenderedModule } from './interface'

const defaultWd = slash(process.cwd())

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

export class AnalyzerNode {
  id: string
  label: string
  isEntry: boolean
  path: string
  statSize: number
  parsedSize: number
  gzipSize: number
  code: Buffer
  // eslint-disable-next-line no-use-before-define
  children: Array<AnalyzerNode>
  // eslint-disable-next-line no-use-before-define
  pairs: Record<string, AnalyzerNode>
  imports: Set<string>

  constructor(id: string, chunk: OutputChunk | RenderedModule & { isEntry?: boolean }) {
    this.id = id
    this.label = id
    this.path = id
    this.children = []
    this.pairs = Object.create(null)
    this.code = Buffer.from(chunk.code ?? '', 'utf8')
    this.isEntry = Boolean(chunk.isEntry)
    this.imports = new Set()
    this.parsedSize = 0
    this.statSize = 0
    this.gzipSize = 0
    this.ensureSize(chunk)
  }

  private ensureSize(chunk: OutputChunk | RenderedModule) {
    if ('originalLength' in chunk) {
      this.parsedSize = chunk.renderedLength
      this.statSize = chunk.originalLength
    }
  }

  private getChild(name: string) {
    return this.pairs[name]
  }

  private addPairs(node: AnalyzerNode) {
    this.pairs[node.id] = node
    return node
  }

  private addPairsNode(key: string, node: AnalyzerNode) {
    const currentPairs = this.pairs[key]
    if (currentPairs) return
    node.label = key
    node.path = key
    this.pairs[key] = node
  }

  private processTreeNode(node: AnalyzerNode) {
    const paths = lexPaths(node.id)
    if (paths.length === 1) {
      this.addPairsNode(node.id, node)
      return
    }
    const [folders, fileName] = paths as [string[], string]
    let references: AnalyzerNode = this
    folders.forEach((folder) => {
      let childNode = references.getChild(folder)
      if (!childNode) childNode = references.addPairs(createAnalyzerNode(folder, { code: '' } as any))
      references = childNode
    })

    if (fileName) {
      references.addPairsNode(fileName, node)
    }
  }

  addImports(...imports: string[]) {
    imports.forEach((imp) => this.imports.add(imp))
  }

  setup(modules: Record<string, RenderedModule>) {
    for (const moduleId in modules) {
      const info = modules[moduleId]
      this.children.push(createAnalyzerNode(moduleId, info))
      this.statSize += info.originalLength
      this.parsedSize += info.renderedLength
    }
    while (this.children.length) {
      const current = this.children.shift()
      if (!current) return
      this.processTreeNode(current)
    }
    this.walk(this)
    this.pairs = {}
  }

  private walk(node: AnalyzerNode) {
    if (!Object.keys(node.pairs).length) return
    for (const name in this.pairs) {
      const ref = this.pairs[name]
      ref.walk(ref)
      ref.pairs = {}
      this.children.push(ref)
    }
  }
}

function generateNodeId(id: string): string {
  const abs = getAbsPath(id)
  return path.isAbsolute(abs) ? abs.replace('/', '') : abs
}

function createAnalyzerNode(id: string, chunk: OutputChunk | RenderedModule) {
  return new AnalyzerNode(generateNodeId(id), chunk)
}

export class AnalyzerModule {
  compress: ReturnType<typeof createGzip>
  modules: AnalyzerNode[]

  constructor(opt?: ZlibOptions) {
    this.compress = createGzip(opt)
    this.modules = []
  }

  addModule(bundleName: string, bundle: OutputChunk) {
    const node = createAnalyzerNode(bundleName, bundle)
    node.addImports(...bundle.imports, ...bundle.dynamicImports)
    node.setup(bundle.modules)
    node.pairs = {}
    this.modules.push(node)
  }

  async processFoamModule() {
    // calc phase. skip the top layer.
    const foams = await Promise.all(this.modules.map(async (node) => {
      const latest = <Foam>{ isAsset: true }
      if (node.children.length) {
        Object.assign(latest, await this.traverse(node))
      } else {
        latest.gzipSize = (await this.compress(node.code)).byteLength
        Object.assign(latest, pick(node, ['path', 'id', 'label', 'statSize', 'parsedSize', 'statSize']))
      }
      latest.isEntry = node.isEntry
      return latest
    }))
    // We only consider top layer entryPointer
    function findEntrypointsRelatedNodes(nodes: AnalyzerNode[]) {
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
    return foams.map(node => ({ ...node, imports: Array.from(entrypointsMap[node.id] ?? []) }))
  }

  private async traverse(node: AnalyzerNode): Promise<Foam> {
    if (!node.children.length) {
      return <Foam>{
        ...pick(node, ['path', 'id', 'label', 'statSize', 'parsedSize']),
        gzipSize: (await this.compress(node.code)).byteLength
      }
    }
    const groups = await Promise.all(node.children.map((child) => this.traverse(child)))
    // merge folder
    if (groups.length === 1 && !path.extname(node.id)) {
      const merged = <Foam>{}
      const childNode = groups[0]
      merged.id = `${node.id}${childNode.id}`
      merged.label = `${node.label}/${childNode.label}`
      merged.path = `${node.path}/${childNode.path}`
      Object.assign(merged, pick(childNode, ['gzipSize', 'statSize', 'parsedSize', 'groups']))
      return merged
    }
    const { statSize, parsedSize, gzipSize } = groups.reduce((acc, cur) => {
      acc.statSize += cur.statSize
      acc.parsedSize += cur.parsedSize
      acc.gzipSize += cur.gzipSize
      return acc
    }, { statSize: 0, parsedSize: 0, gzipSize: 0 })
    return <Foam>{ ...pick(node, ['path', 'id', 'label']), statSize, parsedSize, gzipSize, groups }
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
