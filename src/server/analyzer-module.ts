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
  path: string
  statSize: number
  parsedSize: number
  gzipSize: number
  code: Buffer
  // eslint-disable-next-line no-use-before-define
  children: Array<AnalyzerNode>
  // eslint-disable-next-line no-use-before-define
  pairs: Record<string, AnalyzerNode>
  constructor(id: string, chunk: OutputChunk | RenderedModule) {
    this.id = id
    this.label = id
    this.path = id
    this.children = []
    this.pairs = Object.create(null)
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

function createAnalyzerNode(id: string, chunk: OutputChunk | RenderedModule) {
  const abs = getAbsPath(id)
  return new AnalyzerNode(path.isAbsolute(abs) ? abs.replace('/', '') : abs, chunk)
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
    node.setup(bundle.modules)
    node.pairs = {}
    this.modules.push(node)
  }

  async processfoamModule() {
    const res = await Promise.all(this.modules.map(async (node) => ({ ...await this.traverse(node), isAsset: true })))

    const mergeNodes = (node: Foam) => {
      if (Array.isArray(node.groups)) {
        if (node.groups.length === 1 && !path.extname(node.id)) {
          const childNode = node.groups[0]
          node.id = `${node.id}/${childNode.id}`
          node.label = `${node.label}/${childNode.label}`
          node.path = `${node.path}/${childNode.path}`
          node.gzipSize = childNode.gzipSize
          node.statSize = childNode.statSize
          node.parsedSize = childNode.parsedSize
          node.groups = childNode.groups
          mergeNodes(node)
        } else {
          node.groups.forEach(mergeNodes)
        }
      }
    }
    res.forEach(mergeNodes)
    return res
  }

  private async traverse(node: AnalyzerNode) {
    const base = pick(node, ['id', 'label', 'path', 'gzipSize', 'statSize', 'parsedSize', 'gzipSize'])
    base.gzipSize = (await this.compress(node.code)).byteLength
    if (node.children.length) {
      const groups = await Promise.all(node.children.map((child) => this.traverse(child)))
      const { statSize, parsedSize, gzipSize } = groups.reduce((acc, cur) => {
        acc.statSize += cur.statSize
        acc.parsedSize += cur.parsedSize
        acc.gzipSize += cur.gzipSize
        return acc
      }, { statSize: 0, parsedSize: 0, gzipSize: 0 })
      Object.assign(base, { groups, statSize, parsedSize, gzipSize })
    }
    return base as Foam
  }
}

export function createAnalyzerModule(opt?: ZlibOptions) {
  return new AnalyzerModule(opt)
}
