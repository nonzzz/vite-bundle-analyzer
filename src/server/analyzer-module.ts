import path from 'path'
import { createGzip, slash } from './shared'
import type { AnalyzerPluginOptions, OutputChunk, PluginContext, RenderedModule } from './interface'


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

class AnalyzerNode {
  id: string
  label: string
  path: string
  statSize: number
  parsedSize: number
  gzipSize: number
  code: Buffer
  // eslint-disable-next-line no-use-before-define
  children: Array<AnalyzerNode>
  parent?: unknown
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

  // private processTreeNode(node: AnalyzerNode) {
  //   const { id } = node
  //   const paths = lexPaths(id)
  //   // let scenceRef = scence
  //   // for (let i = 0; i < paths.length; i++) {
  //   //   const current = paths[i]
  //   //   if (!scenceRef[current]) {
  //   //     scenceRef[current] = {}
  //   //     if (i + 1 === paths.length) {
  //   //       console.log(node)
  //   //       scenceRef[current] = node.hah()
  //   //     } 
  //   //   } else {
  //   //     // has

  //   //     // scenceRef[current].groups.push(node.hah())
  //   //   }
  //   //   scenceRef = scenceRef[current]
  //   // }
  //   // // for (const p of paths) {
  //   // //   if (!scenceRef[p]) {
  //   // //     scenceRef[p] = { groups: [] }
  //   // //     scenceRef[p].groups.push(node)
  //   // //   } else {
  //   // //     scenceRef[p].groups.push(node)
  //   // //   }
  //   // //   scenceRef = scenceRef[p]
  //   // //   //   scence[p] = {}
  //   // //   //   scence[p].id = id
  //   // //   //   scence[p].label = node.label
  //   // //   //   scence[p].groups = node.children
  //   // //   // } else {
  //   // //   //   scence[p].groups.push(node.hah())
  //   // //   // }
  //   // //   //  else {
  //   // //   //   scence[p].groups = []
  //   // //   //   scence[p].groups.push(node)
  //   // //   // }
  //   // // }
  // }

  private getChild(name: string) {
    return this.paris[name]
  }

  private addPairs(node: AnalyzerNode) {
    this.paris[node.id] = node
    return node
  }

  private processTreeNode(node: AnalyzerNode) {
    const paths = lexPaths(node.id)
    if (paths.length === 1) {
      this.paris[node.id] = node
      return
    }
    const [folders, fileName] = paths as [string[], string]
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let references: AnalyzerNode = this
    folders.forEach((folder) => {
      let childNode = references.getChild(folder)
      if (!childNode) {
        childNode = references.addPairs(createAnalyzerNode(folder, {} as any))
      }
      references = childNode
      if (fileName) {
        references.children.push(node)
      }
    })
  }

  setup(pluginContext: PluginContext, modules: Record<string, RenderedModule>) {
    for (const moduleId in modules) {
      const info =  modules[moduleId]
      this.children.push(createAnalyzerNode(moduleId, info))
      this.statSize += info.originalLength
      this.parsedSize += info.renderedLength
    }
    while (this.children.length) {
      const current =  this.children.shift()
      if (!current) return
      this.processTreeNode(current)
    }
    console.log(JSON.stringify(this.paris))
  }
}


function createAnalyzerNode(id: string, chunk: OutputChunk | RenderedModule) {
  const abs = getAbsPath(id)
  return new  AnalyzerNode(path.isAbsolute(abs) ? abs.replace('/', '') : abs, chunk)
}

class AnalyzerModule {
  compress: ReturnType<typeof createGzip>
  pluginContext: PluginContext
  modules: any[]
  constructor(opts: AnalyzerPluginOptions) {
    this.compress = createGzip(opts.gzipOptions)
    this.pluginContext = Object.create(null)
    this.modules = []
  }

  addModule(bundleName: string, bundle: OutputChunk) {
    const node = createAnalyzerNode(bundleName, bundle)
    node.setup(this.pluginContext, bundle.modules)
    this.modules.push(node)
  }
}

export function createAnalyzerModule(opts: AnalyzerPluginOptions) {
  return new AnalyzerModule(opts)
}
