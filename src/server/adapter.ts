// adapter for rollup
import type { RolldownPlugin } from 'rolldown'
import type { Plugin } from 'rollup'
import type { Plugin as VitePlugin } from 'vite'
import { searchForWorkspaceRoot } from 'workspace-sieve'
import type { AnalyzerPluginInternalAPI } from './interface'
import { pick } from './shared'

type PluginType = 'rollup' | 'rolldown'
type PluginReturn<T extends PluginType | undefined> = T extends 'rolldown' ? RolldownPlugin
  : Plugin

export function adapter<T extends PluginType | undefined = 'rollup'>(
  userPlugin: VitePlugin<AnalyzerPluginInternalAPI>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _?: T
): PluginReturn<T> {
  const plugin = pick(userPlugin, ['name', 'generateBundle', 'closeBundle', 'api'])
  let root = process.cwd()
  const { store } = plugin.api!
  return <PluginReturn<'rollup'>> {
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
  } as PluginReturn<T>
}
