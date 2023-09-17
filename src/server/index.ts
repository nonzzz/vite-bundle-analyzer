import fsp from 'fs/promises'
import path from 'path'
import type{ Plugin } from 'vite'
import { name } from '../../package.json'
import type { AnalyzerPluginOptions,  OutputBundle, PluginContext, RenderChunk, RenderedModule } from './interface'
import { createModule } from './module'
import { createGzip } from './shared'

const NODE_MODULES = /node_modules/

const VIRTUAL_MODULES = '\0'

const defaultWd = process.cwd()

function analyzer(opts: AnalyzerPluginOptions = {}): Plugin {
  const { analyzerMode = 'json', defaultSizes = 'parsed', statsFilename  = 'stats.json' } = opts
  const wrapper = createModule()
  const needGzip = defaultSizes === 'gzip'
  let compress: ReturnType<typeof createGzip> | undefined = undefined
  if ('gzipOptions' in opts) {
    compress = createGzip(opts.gzipOptions)
  }
  // const compress = defaultSizes ==='gzip'?opts.
  // return {
  //   name,
  //   apply: 'build',
  //   enforce: 'post',
  //   renderChunk(_, chunk) {
  //     // Skip not entry or dynamic Entry point.
  //     // Duplicate module should be skip.
  //     // The same thing needs to be skipped in vite. (.html)
  //     if (!chunk.isEntry && !chunk.isDynamicEntry) return 
  //     for (const module in chunk.modules) {
  //       if (NODE_MODULES.test(module) || module.startsWith(VIRTUAL_MODULES) || module.endsWith('.html')) continue
  //       chunks.set(module, chunk.modules[module])
  //     }
  //   },

  // For better performance. All IO task should be trigger at closeBundle stage (delay task excution)
  // Another advantage is that if we do this when us options `defaultSizes` is parsed or `stat` can
  // skip a long task.

  function renderChunk(ctx: PluginContext, chunk: RenderChunk) {
    // 
  }

 
  function generateBundle(ctx: PluginContext, outputBundle: OutputBundle) {
    wrapper.pluginContext = ctx
    for (const bundleName in outputBundle) {
      const bundle = outputBundle[bundleName]
      if (bundle.type !== 'chunk') continue
      // createModule(bundle)
      wrapper.processModule(bundleName, bundle)
      // console.log(ctx.getModuleInfo(bundle.facadeModuleId!)?.importedIds)
    }
  }

  const plugin = <Plugin>{
    name,
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      switch (analyzerMode) {
        case 'json': {
          // const p = path.join(defaultWd, statsFilename)
          // fsp.writeFile(p, JSON.stringify(wrapper.children, null, 2), 'utf8')
          break
        }
        case 'static':
          break
      }
      console.log(wrapper.children[0].children)
    }
  }

  switch (defaultSizes) {
    case 'stat':
      plugin.renderChunk = function (_, chunk) {
        renderChunk.call(this, this, chunk)
      }
      break
    case 'parsed':
    case 'gzip':
      plugin.generateBundle = function (_, outputBundle) {
        generateBundle.call(this, this, outputBundle)
      }
      break
    default:
      throw new Error('Invalid option `defaultSizes`')
  }

  return plugin
}

export { analyzer }

export { analyzer as default }
