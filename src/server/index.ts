import fsp from 'fs/promises'
import path from 'path'
import type{ Plugin } from 'vite'
import { name } from '../../package.json'
import { defaultWd } from './shared'
import type { AnalyzerPluginOptions,  OutputBundle, PluginContext  } from './interface'
import { createAnalyzerModule } from './analyzer-module'
import { renderView } from './render'


function analyzer(opts: AnalyzerPluginOptions = {}): Plugin {
  const { analyzerMode = 'static',  statsFilename  = 'stats.json', reportFileName = 'analyzer.html' } = opts
  const analyzerModule = createAnalyzerModule(opts)
  
 
  function generateBundle(ctx: PluginContext, outputBundle: OutputBundle) {
    analyzerModule.pluginContext = ctx
    // After consider. I trust process chunk is enougth. (If you don't think it's right. PR welcome.)
    for (const bundleName in outputBundle) {
      const bundle = outputBundle[bundleName]
      if (bundle.type !== 'chunk') continue
      analyzerModule.addModule(bundleName, bundle)
    }
    console.log(analyzerModule.modules[0].children)
  }

  const plugin = <Plugin>{
    name,
    apply: 'build',
    enforce: 'post',
    generateBundle(_, outputBundle) {
      generateBundle.call(this, this, outputBundle)
    },
    async closeBundle() {
      switch (analyzerMode) {
        case 'json': {
          // const p = path.join(defaultWd, statsFilename)
          // const json = await wrapper.pretty()
          // fsp.writeFile(p, JSON.stringify(json, null, 2), 'utf8')
          break
        }
        case 'static': {
          // const p = path.join(defaultWd, reportFileName)
          // const html = await renderView(wrapper, { title: name, mode: 'stat' })
          // fsp.writeFile(p, html, 'utf8')
          break
        }
        default:
          throw new Error('Invalidate Option `analyzerMode`')
      }
    }
  }

  return plugin
}

export { analyzer }

export { analyzer as default }
