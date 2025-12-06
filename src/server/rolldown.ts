// rolldown adapter is an experimental wrapper
// version: rolldown 1.0.0-beta.7
// This adapter is unstable because the hook `closeBundle` of rolldown isn't
// same with rollup
import path from 'path'
import type { Plugin as RolldownPlugin } from 'rolldown'
import compare from 'semver/functions/compare'
import { type Plugin as VitePlugin } from 'vite'
import { searchForWorkspaceRoot } from 'workspace-sieve'
import { createAnalyzerServer, handleStaticOutput, openBrowser } from '.'
import type { AnalyzerPluginInternalAPI } from './interface'
import { getFileURL } from './opener'
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

  if (!store.pluginOptions.enabled) {
    return plugin
  }

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

      let staticFilePath = ''
      if (opts.analyzerMode === 'json' || opts.analyzerMode === 'static') {
        const { filePath } = await handleStaticOutput(latest, opts, defaultWd, b)
        if (opts.analyzerMode === 'static' && !opts.openAnalyzer) {
          return
        }
        // https://github.com/rolldown/rolldown/commit/f66ae54b2a0f40301272e75493a0844b0dbcedcb
        if (this.meta.rolldownVersion) {
          const version = this.meta.rolldownVersion
          if (compare(version, '1.0.0-beta.48') < 0) {
            console.error(
              'vite-bundle-analyzer: The minimum supported version for `openAnalyzer` is 1.0.0-beta.48. Please upgrade your rolldown version.'
            )
            return
          }
        }
        staticFilePath = filePath
      }
      if (store.preferLivingServer) {
        if (opts.analyzerMode === 'static' && staticFilePath) {
          openBrowser(getFileURL(staticFilePath))
          return
        }

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
