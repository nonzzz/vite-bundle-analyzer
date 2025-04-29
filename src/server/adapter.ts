// adapter for rollup
import path from 'path'
import type { Plugin } from 'rollup'
import type { Plugin as VitePlugin } from 'vite'
import { searchForWorkspaceRoot } from 'workspace-sieve'
import type { AnalyzerPluginInternalAPI } from './interface'
import { pick } from './shared'

export function adapter(userPlugin: VitePlugin<AnalyzerPluginInternalAPI>) {
  const plugin = pick(userPlugin, ['name', 'generateBundle', 'closeBundle', 'api'])
  const { store } = plugin.api!
  return <Plugin> {
    ...plugin,
    outputOptions(outputOptions) {
      let workspaceRoot = searchForWorkspaceRoot(process.cwd())

      if (workspaceRoot === '.' && outputOptions.dir) {
        const potentialRoot = path.resolve(outputOptions.dir, '..')
        const foundRoot = searchForWorkspaceRoot(potentialRoot)
        if (foundRoot !== '.') {
          workspaceRoot = foundRoot
        }
      }
      store.analyzerModule.workspaceRoot = workspaceRoot

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
