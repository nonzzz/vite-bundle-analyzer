import { createAnalyzerModule as _createAnalyzerModule } from '../server/analyzer-module'
import type { AnalyzerModuleOptions } from '../server/analyzer-module'
import { PluginContext } from '../server/interface'

export interface DuckModuleInfo {
  code: string | Uint8Array
  id: string
}

export interface DuckContext {
  getModuleInfo: (id: string) => DuckModuleInfo
}

export function createAnalyzerModule(opt: AnalyzerModuleOptions = {}) {
  const analyzeModule = _createAnalyzerModule(opt)

  return {
    setupRollupChunks: analyzeModule.setupRollupChunks.bind(analyzeModule),
    addModule: analyzeModule.addModule.bind(analyzeModule),
    processModule: analyzeModule.processModule.bind(analyzeModule),
    setupPluginContextPolyfill: (c: DuckContext) => {
      analyzeModule.installPluginContext(c as PluginContext)
    }
  }
}
