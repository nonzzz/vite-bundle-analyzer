import fsp from 'fs/promises'
import path from 'path'
import type{ Plugin } from 'vite'
import { name } from '../../package.json'
import type { AnalyzerPluginOptions,  OutputBundle, PluginContext  } from './interface'
import { createModule } from './module'

const defaultWd = process.cwd()

function analyzer(opts: AnalyzerPluginOptions = {}): Plugin {
  const { analyzerMode = 'json',  statsFilename  = 'stats.json' } = opts
  const wrapper = createModule(opts)
  
 
  function generateBundle(ctx: PluginContext, outputBundle: OutputBundle) {
    wrapper.pluginContext = ctx
    for (const bundleName in outputBundle) {
      const bundle = outputBundle[bundleName]
      if (bundle.type !== 'chunk') continue
      wrapper.processModule(bundleName, bundle)
    }
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
          const p = path.join(defaultWd, statsFilename)
          const json = await wrapper.pretty()
          fsp.writeFile(p, JSON.stringify(json, null, 2), 'utf8')
          break
        }
        case 'static':
          break
      }
    }
  }

  return plugin
}

export { analyzer }

export { analyzer as default }
