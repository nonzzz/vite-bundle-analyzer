// adapter for rollup
import type { Plugin } from 'rollup'
import type { Plugin as VitePlugin } from 'vite'
import type { AnalyzerStore } from './interface'
import { searchForWorkspaceRoot } from './search-root'
import { pick } from './shared'

export function adapter(userPlugin: VitePlugin<{ store: AnalyzerStore }>) {
  const plugin = pick(userPlugin, ['name', 'generateBundle', 'closeBundle', 'api'])
  let root = process.cwd()
  const { store } = plugin.api!
  return <Plugin> {
    ...plugin,
    outputOptions(outputOptions) {
      if (outputOptions.dir) {
        root = outputOptions.dir
      }
      store.analyzerModule.workspaceRoot = searchForWorkspaceRoot(root)
      // setup sourcemap hack
      if ('sourcemap' in outputOptions && !store.hasSetupSourcemapOption) {
        store.lastSourcemapOption = typeof outputOptions.sourcemap === 'boolean'
          ? outputOptions.sourcemap
          : outputOptions.sourcemap === 'hidden'
      }
      if (typeof outputOptions.sourcemap === 'boolean' && outputOptions.sourcemap) {
        outputOptions.sourcemap = true
      } else {
        outputOptions.sourcemap = 'hidden'
      }
      store.hasSetupSourcemapOption = true
      return outputOptions
    }
  }
}
