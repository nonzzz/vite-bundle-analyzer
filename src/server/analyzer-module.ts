import path from 'path'
import { createGzip, pick, slash } from './shared'
import type { AnalyzerPluginOptions, Foram, OutputChunk, PluginContext, RenderedModule } from './interface'


const defaultWd = slash(process.cwd())

function getAbsPath(p: string) {
  p = slash(p)
  return p.replace(defaultWd, '').replace(/\0/, '')
}

function lexPaths(p: string) {
  const dirs = p.split('/')
  if (dirs.length === 1) return dirs
  const total: string[] = []
  const fileName = dirs.pop()!
  while (dirs.length) {
    const latest = dirs.shift()!
    total.push(latest)
  }
  return [total, fileName]
}


export class AnalyzerNode {
  id: string
  label: string
  path: string
  statSize: number
  parsedSize: number
  gzipSize: number
  code: Buffer
  // eslint-disable-next-line no-use-before-define
  children: Array<AnalyzerNode>
  // eslint-disable-next-line no-use-before-define
  paris: Record<string, AnalyzerNode>
  constructor(id: string, chunk: OutputChunk | RenderedModule) {
    this.id = id
    this.label = id
    this.path = id
    this.children = []
    this.paris = Object.create(null)
    this.code = Buffer.from(chunk.code ?? '', 'utf8')
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
    return this.paris[name]
  }

  private addPairs(node: AnalyzerNode) {
    this.paris[node.id] = node
    return node
  }

  private addPairsNode(key: string, node: AnalyzerNode) {
    const currentPairs = this.paris[key]
    if (currentPairs) return
    node.label = key
    node.path = key
    this.paris[key] = node
  }

  private processTreeNode(node: AnalyzerNode) {
    const paths = lexPaths(node.id)
    if (paths.length === 1) {
      this.addPairsNode(node.id, node)
      return
    }
    const [folders, fileName] = paths as [string[], string]
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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

  setup(modules: Record<string, RenderedModule>) {
    for (const moduleId in modules) {
      const info =  modules[moduleId]
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
    this.paris = {}
  }

  private walk(node: AnalyzerNode) {
    if (!Object.keys(node.paris).length) return
    for (const name in this.paris) {
      const ref = this.paris[name]
      ref.walk(ref)
      ref.paris = {}
      ref.code = Buffer.from('')
      this.children.push(ref)
    }
  }
}


function createAnalyzerNode(id: string, chunk: OutputChunk | RenderedModule) {
  const abs = getAbsPath(id)
  return new AnalyzerNode(path.isAbsolute(abs) ? abs.replace('/', '') : abs, chunk)
}

export class AnalyzerModule {
  compress: ReturnType<typeof createGzip>
  pluginContext: PluginContext
  modules: AnalyzerNode[]
  constructor(opts: AnalyzerPluginOptions) {
    this.compress = createGzip(opts.gzipOptions)
    this.pluginContext = Object.create(null)
    this.modules = []
  }

  addModule(bundleName: string, bundle: OutputChunk) {
    const node = createAnalyzerNode(bundleName, bundle)
    node.setup(bundle.modules)
    node.paris = {}
    this.modules.push(node)
  }

  processForamModule() {
    return this.modules.map((node) => this.traverse(node))
  }

  private traverse(node: AnalyzerNode) {
    const base = pick(node, ['id', 'label', 'path', 'gzipSize', 'statSize', 'parsedSize'])
    if (node.children.length) Object.assign(base, { groups: node.children.map((child) => this.traverse(child)) })
    return base as Foram
  }
}

export function createAnalyzerModule(opts: AnalyzerPluginOptions) {
  return new AnalyzerModule(opts)
}
