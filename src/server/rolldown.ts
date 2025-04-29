// rolldown adapter is an experimental wrapper
// version: rolldown 1.0.0-beta.7
// This adapter is unstable because the hook `closeBundle` of rolldown isn't
// same with rollup
import path from 'path'
import type { Plugin as RolldownPlugin } from 'rolldown'
import { type Plugin as VitePlugin } from 'vite'
import { searchForWorkspaceRoot } from 'workspace-sieve'
import { createAnalyzerServer, handleStaticOutput, isCI } from '.'
import type { AnalyzerPluginInternalAPI } from './interface'
import type { CreateServerContext } from './render'
import { SSE, injectHTMLTag, renderView as _renderView } from './render'
import { arena, pick } from './shared'

async function renderView(...args: Parameters<typeof _renderView>) {
  let html = await _renderView(...args)
  html = injectHTMLTag({
    html,
    injectTo: 'body',
    descriptors: {
      kind: 'script',
      text: `
       new EventSource('/__vite__bundle__analyer').addEventListener('refresh', () => {
          window.location.reload();
       })
      `
    }
  })

  return html
}

export function unstableRolldownAdapter(userPlugin: VitePlugin<AnalyzerPluginInternalAPI>) {
  const plugin = pick(userPlugin, ['name', 'generateBundle', 'api'])
  const { store } = plugin.api!
  const b = arena()
  let callCount = 0
  const sse = new SSE()
  let server: CreateServerContext

  // define a counter variable to calc build instance count. it's not same with rollup
  // maybe never fixed by rolldown (Or it's a feature for rolldown)
  // The logic of rolldown processing on the rust side seems to be share a plug-in instance during the build process.
  // But all asynchronous tasks are serial.
  // eg:
  //  const instance = {}
  //  for (let output of outputs) {
  //   await buildTask(instance)
  //  }
  return <RolldownPlugin> {
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
    },
    async closeBundle() {
      if (server) {
        const latest = store.analyzerModule.processModule()
        const html = await renderView(latest, {
          title: store.pluginOptions.reportTitle!,
          mode: store.pluginOptions.defaultSizes || 'stat'
        })
        b.refresh(html)
        sse.sendEvent('refresh', JSON.stringify({ timestamp: Date.now() }))
        return
      }

      const opts = store.pluginOptions
      const latest = store.analyzerModule.processModule()
      const defaultWd = store.analyzerModule.workspaceRoot
      if (typeof opts.analyzerMode === 'function') {
        opts.analyzerMode(latest)
        return
      }
      if (opts.analyzerMode === 'json' || opts.analyzerMode === 'static') {
        await handleStaticOutput(latest, opts, defaultWd, b)
        if (opts.analyzerMode === 'static' && opts.openAnalyzer && !isCI) {
          console.error('vite-bundle-analyzer: openAnalyzer is not supported in rolldown adapter')
        }
        return
      }
      if (store.preferLivingServer) {
        const { server: newServer } = await createAnalyzerServer(
          latest,
          opts,
          b,
          callCount,
          {
            path: '/__vite__bundle__analyer',
            handler: (c, next) => {
              if (c.req.headers.accept === 'text/event-stream') {
                sse.serverEventStream(c.req, c.res)
              }
              next()
            }
          },
          renderView
        )
        server = newServer
      }

      callCount++
    }
  }
}
