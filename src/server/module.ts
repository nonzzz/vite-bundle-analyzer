import path from 'path'
import { createGzip, pick, slash } from './shared'
import type { AnalyzerPluginOptions, OutputChunk, PluginContext, RenderedModule } from './interface'

type ModuleInfo = NonNullable<ReturnType<PluginContext['getModuleInfo']>>

type MoudleMeta = Pick<ModuleInfo, 'code' | 'id'> & Pick<RenderedModule, 'originalLength' | 'renderedLength'>

interface PrettyNode {
  id: string
  statSize: number
  parsedSize: number
  gzipSize?: number
}

export const EMPTY_IDENTIFIER = '__empty__'

const defaultWd = slash(process.cwd())

function getAbsPath(p: string) {
  p = slash(p)
  return p.replace(defaultWd, '').replace(/\0/, '')
}

class Node implements MoudleMeta {
  code: string | null = null
  id: string = EMPTY_IDENTIFIER
  renderedLength = 0
  originalLength = 0
  // eslint-disable-next-line no-use-before-define
  children: Array<Record<string, Array<Node>>>
  binary: Buffer
  compress: ReturnType<typeof createGzip> | null
  constructor() {
    this.children = []
    this.binary = Buffer.alloc(0)
    this.compress = null
  }

  fill(attrs: MoudleMeta) {
    const { renderedLength, originalLength, id, code } = attrs
    this.renderedLength = renderedLength
    this.originalLength = originalLength
    this.id = getAbsPath(id)
    this.binary = Buffer.from(code || '', 'utf8')
  }

  async pretty() {
    const info: PrettyNode = {
      id: this.id,
      statSize: this.originalLength || this.binary.byteLength,
      parsedSize: this.renderedLength || this.binary.byteLength
    }
    if (this.compress) info.gzipSize = (await this.compress(this.binary)).byteLength
    return info
  }
}

export class Module {
  children: Array<Node>
  pluginContext: PluginContext
  compress: ReturnType<typeof createGzip>
  constructor(opts: AnalyzerPluginOptions) {
    this.children = []
    this.pluginContext = Object.create(null)
    this.compress = createGzip(opts.gzipOptions)
  }

  private bindModuleMeta(id: string, renderedModule: RenderedModule) {
    const moduleInfo = this.pluginContext.getModuleInfo(id)
    const node = new Node()
    if (moduleInfo) {
      node.compress = this.compress
      node.fill({ ...pick(moduleInfo, ['code', 'id']), ...pick(renderedModule, ['originalLength', 'renderedLength']) })
    }
    return node
  }

  processModule(bundleName: string, bundle: OutputChunk) {
    const node = new Node()
    node.id = bundleName
    node.compress = this.compress
    node.binary = Buffer.from(bundle.code, 'utf8')
    node.children = (() => {
      const original = Object.entries(bundle.modules).map((argvs) => this.bindModuleMeta(...argvs))
      const store: Record<string, Array<Node>> = {}
      for (const meta of original) {
        const { id } = meta
        const relative = path.isAbsolute(id) ? id.replace('/', '') : id
        const dir  = path.dirname(relative)
        const uId = dir === '.' ? id : dir
        if (!store[uId]) store[uId] = []
        store[uId].push(meta)
      }
      return Object.entries(store).map(([key, v]) => ({ [key]: v }))
    })()
    this.children.push(node)
  }

  pretty() {
    if (!this.children.length) throw new Error('Can\'t generator anything with empty chunks')
   
    const prettyChild = async (child: Record<string, Node[]>) => {
      for (const k in child) {
        const node = child[k]
        return  { [k]: await Promise.all(node.map(n => n.pretty())) }
      }
      return {}
    }

    return Promise.all(this.children.map(async (node) => {
      const { children } = node
      const result: Array<Record<string, PrettyNode[]>> = []
      if (children.length) {
        for (const child of children) {
          const s = await prettyChild(child)
          result.push(s)
        }
      }
      return { ...await node.pretty(), children: result }
    }))
  }

  nested() {
    // convert a nested struct for viewers
  }
}


export function createModule(opts: AnalyzerPluginOptions) {
  return new Module(opts)
}
