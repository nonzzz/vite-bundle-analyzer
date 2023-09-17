// import path from 'path'
import { pick, slash } from './shared'
import type { OutputChunk, PluginContext, RenderedModule } from './interface'

type ModuleInfo = NonNullable<ReturnType<PluginContext['getModuleInfo']>>

type MoudleMeta = Pick<ModuleInfo, 'dynamicallyImportedIds' | 'code' | 'id'> & Pick<RenderedModule, 'originalLength' | 'renderedLength'>

// id
// pairs [Array? Or Map?]
// meta [contain gzip size renderSize(stat size?)]
// children []Node

export const EMPTY_IDENTIFIER = '__empty__'

const defaultWd = slash(process.cwd())

function getAbsPath(p: string) {
  p = slash(p)
  return p.replace(defaultWd, '').replace(/\0/, '')
}

class Node implements MoudleMeta {
  code: string | null = null
  id: string = EMPTY_IDENTIFIER
  dynamicallyImportedIds: readonly string[] = []
  renderedLength: number = 0
  originalLength: number = 0
  children: MoudleMeta[]
  binary: Buffer
  constructor() {
    this.children = []
    this.binary = Buffer.alloc(0)
  }

  fill(attrs: MoudleMeta) {
    const { renderedLength, originalLength, id, dynamicallyImportedIds, code } = attrs
    this.renderedLength = renderedLength
    this.originalLength = originalLength
    this.id = getAbsPath(id)
    this.dynamicallyImportedIds = dynamicallyImportedIds
    this.binary = Buffer.from(code || '', 'utf8')
  }
  // get parentPath() {
  //   return path.dirname(this.id)
  // }
}

// In long process task(memory is precious)
// So Node shouldn't contain too many functions.
// processModule inner func (convertAsTree should be inline.The compiler will optimize it)

class Module {
  children: Array<Node>
  pluginContext: PluginContext
  constructor() {
    this.children = []
    this.pluginContext = Object.create(null)
  }

  private bindModuleMeta(id: string, renderedModule: RenderedModule) {
    const moduleInfo = this.pluginContext.getModuleInfo(id)
    const node = new Node()
    if (moduleInfo) {
      node.fill({ ...pick(moduleInfo, ['dynamicallyImportedIds', 'code', 'id']), ...pick(renderedModule, ['originalLength', 'renderedLength']) })
    }
    return node
  }

  processModule(bundleName: string, bundle: OutputChunk) {
    const node = new Node()
    node.id = bundleName
    node.children = (() => {
      const original = Object.entries(bundle.modules).map((argvs) => this.bindModuleMeta(...argvs))
      return original
    })()
    // this.prepareModule(original)
    // node.children = Object.entries(bundle.modules).map((argvs) => this.bindModuleMeta(...argvs))
    this.children.push(node)
    // ;((module:Array<Node>) => {
    //   // 
    // })()
  }
}


export function createModule() {
  return new Module()
}
