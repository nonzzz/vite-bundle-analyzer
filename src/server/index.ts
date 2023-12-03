import path from 'path'
import fsp from 'fs/promises'
import type { Plugin } from 'vite'
import { name } from '../../package.json'
import { renderView } from './render'
import type { AnalyzerPluginOptions, ConfigResolveParameter } from './interface'
import { createAnalyzerModule } from './analyzer-module'
import { createServer } from './server'

const isCI = !!process.env.CI

async function openBrowser(address: string) {
  await import('open').then((module) => module.default(address, { newInstance: true })).catch(() => {})
}

// We hijack vite's inernal minify plugin and re set ’sourcemap‘ option for each chunk.
// Don't worry we'll still respecet user options
// Or we also want user to use the plugin on rollup.
function hijackViteMinifyPlugin(conf: ConfigResolveParameter) {
  // https://github.com/vitejs/vite/blob/716286ef21f4d59786f21341a52a81ee5db58aba/packages/vite/src/node/plugins/esbuild.ts#L289-L307
  const internalPluginNames = ['vite:esbuild-transpile', 'vite:terser']
  // Minify logic
  // https://github.com/vitejs/vite/blob/716286ef21f4d59786f21341a52a81ee5db58aba/packages/vite/src/node/build.ts#L414-L417
  const { minify } = conf.build
  const name = [true, 'esbuild'].includes(minify) ? internalPluginNames[0] : minify === 'terser' ? internalPluginNames[1] : ''
  if (!name) return 
  // https://vitejs.dev/config/build-options.html#build-sourcemap
  // ensure `sourcemap` option
  if (!conf.build.sourcemap) conf.build.sourcemap = 'hidden'
  const plugin = conf.plugins.find(p => p.name === name)
  const hook = plugin?.renderChunk
  if (!hook) return
  if (typeof hook === 'function') {
    plugin.renderChunk = async function (this, ...args: any) {
      const res = await hook.apply(this, args)
      return res
    }
  } 
}

function analyzer(opts: AnalyzerPluginOptions = { analyzerMode: 'server' }): Plugin {
  const { reportTitle = name } = opts
  const analyzerModule = createAnalyzerModule(opts?.gzipOptions)
  let defaultWd = process.cwd()

  let previousSourcemapOption: any = false
  const plugin = <Plugin>{
    name,
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      defaultWd = config.build.outDir ?? config.root
      previousSourcemapOption = typeof config.build.sourcemap === 'boolean'
        ? config.build.sourcemap
        : config.build.sourcemap === 'hidden' ? true : false
      hijackViteMinifyPlugin(config)
    },
    generateBundle(_, outputBundle) {
      // After consider. I trust process chunk is enougth. (If you don't think it's right. PR welcome.)
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        if (bundle.type !== 'chunk') continue
        analyzerModule.addModule(bundleName, bundle)
        if (!previousSourcemapOption && bundle.sourcemapFileName) {
          Reflect.deleteProperty(outputBundle, bundle.sourcemapFileName)
        }
      }
    },
    async closeBundle() {
      switch (opts.analyzerMode) {
        case 'json': {
          const p = path.join(defaultWd, opts.fileName ? `${opts.fileName}.json` : 'stats.json')
          const foamModule = await analyzerModule.processFoamModule()
          fsp.writeFile(p, JSON.stringify(foamModule, null, 2), 'utf8')
          break
        }
        case 'static': {
          const p = path.join(defaultWd, opts.fileName ? `${opts.fileName}.html` : 'stats.html')
          const foamModule = await analyzerModule.processFoamModule()
          const html = await renderView(foamModule, { title: reportTitle, mode: 'stat' })
          fsp.writeFile(p, html, 'utf8')
          break
        }
        case 'server': {
          const foamModule = await analyzerModule.processFoamModule()
          const { setup, port } = createServer((opts.analyzerPort === 'atuo' ? 0 : opts.analyzerPort) ?? 8888)
          setup(foamModule, { title: reportTitle, mode: 'stat' })
          if ((opts.openAnalyzer ?? true) && !isCI) {
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
