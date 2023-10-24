import fsp from 'fs/promises'
import path from 'path'
import type { Plugin } from 'vite'
import { name } from '../../package.json'
import type { AnalyzerPluginOptions } from './interface'
import { createAnalyzerModule } from './analyzer-module'
import { renderView } from './render'
import { createServer } from './server'

const isCI = !!process.env.CI

async function openBrowser(address: string) {
  await import('open').then((module) => module.default(address, { newInstance: true })).catch(() => {})
}

function analyzer(opts: AnalyzerPluginOptions = {}): Plugin {
  const { analyzerMode = 'server',
    statsFilename = 'stats.json',
    reportFileName = 'analyzer.html', 
    analyzerPort = 8888,
    openAnalyzer = true,
    reportTitle = name
  } = opts
  const analyzerModule = createAnalyzerModule(opts)
  let defaultWd = process.cwd()
  
  const plugin = <Plugin>{
    name,
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      defaultWd = config.root
    },
    generateBundle(_, outputBundle) {
      // After consider. I trust process chunk is enougth. (If you don't think it's right. PR welcome.)
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        if (bundle.type !== 'chunk') continue
        analyzerModule.addModule(bundleName, bundle)
      }
    },
    async closeBundle() {
      switch (analyzerMode) {
        case 'json': {
          const p = path.join(defaultWd, statsFilename)
          const foamModule = await analyzerModule.processfoamModule()
          fsp.writeFile(p, JSON.stringify(foamModule, null, 2), 'utf8')
          break
        }
        case 'static': {
          const p = path.join(defaultWd, reportFileName)
          const foamModule = await analyzerModule.processfoamModule()
          const html = await renderView(foamModule, { title: reportTitle, mode: 'stat' })
          fsp.writeFile(p, html, 'utf8')
          break
        }
        case 'server': {
          const foamModule = await analyzerModule.processfoamModule()
          const { setup, port } = createServer(analyzerPort === 'atuo' ? 0 : analyzerPort)
          setup(foamModule, { title: reportTitle, mode: 'stat' })
          if (openAnalyzer && !isCI) {
            const address = `http://localhost:${port}`
            await openBrowser(address)
          }
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
export { AnalyzerPluginOptions } from './interface'
