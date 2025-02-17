import ansis from 'ansis'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import type { Logger, Plugin } from 'vite'
import zlib from 'zlib'
import { AnalyzerNode, JS_EXTENSIONS, createAnalyzerModule } from './analyzer-module'
import type { AnalyzerPluginInternalAPI, AnalyzerPluginOptions, AnalyzerStore } from './interface'
import { opener } from './opener'
import { createServer, ensureEmptyPort, renderView } from './render'
import { searchForWorkspaceRoot } from './search-root'
import { analyzerDebug, convertBytes, fsp, stringToByte } from './shared'

const isCI = !!process.env.CI

const defaultOptions: AnalyzerPluginOptions = {
  analyzerMode: 'server',
  defaultSizes: 'stat',
  summary: true
}

export function openBrowser(address: string) {
  opener([address])
}

function arena() {
  let hasSet = false
  let binary: Uint8Array
  return {
    rs: new Readable(),
    into(b: string | Uint8Array) {
      if (hasSet) { return }
      this.rs.push(b)
      this.rs.push(null)
      if (!binary) {
        binary = stringToByte(b)
      }
      hasSet = true
    },
    refresh() {
      hasSet = false
      this.rs = new Readable()
      this.into(binary)
    }
  }
}

const formatNumber = (number: number | string) => ansis.dim(ansis.bold(number + ''))

const formatSize = (number: number) => formatNumber(convertBytes(number))

const generateSummaryMessage = (modules: AnalyzerNode[]) => {
  const count = modules.length
  const meta = modules.reduce((acc, module) => {
    acc.gzip += module.gzipSize
    acc.parsed += module.parsedSize
    acc.map += module.mapSize
    return acc
  }, {
    gzip: 0,
    parsed: 0,
    map: 0
  })
  const extra = [
    meta.gzip && `gzip: ${formatSize(meta.gzip)}`,
    meta.map && `map: ${formatSize(meta.map)}`
  ].filter(Boolean).join(' | ')
  return `${formatNumber(count)} chunks of ${formatSize(meta.parsed)} ${extra ? `(${extra})` : ''}`
}

// Design for race condition is called
let callCount = 0

// There is a possibility that multiple called.
// Thre're two scenarios:
// First, user create multiple build task each config object is isolated.
// Second, user use the same config object but the build task is parallel. (Like vitepress or vuepress)
// However, about sourcemap state should always declare in the plugin object to makesure those scenarios can be handled.
// callCount is specifically for the Second scenario.
// If someone has a better idea, PR welcome.

function analyzer(opts?: AnalyzerPluginOptions) {
  opts = { ...defaultOptions, ...opts }

  const { reportTitle = 'vite-bundle-analyzer' } = opts
  const analyzerModule = createAnalyzerModule({ gzip: opts.gzipOptions, brotli: opts.brotliOptions })
  const store: AnalyzerStore = { analyzerModule, lastSourcemapOption: false, hasSetupSourcemapOption: false }
  let defaultWd = process.cwd()
  let hasViteReporter = true
  let logger: Logger
  let workspaceRoot = process.cwd()
  const preferLivingServer = opts.analyzerMode === 'server' || opts.analyzerMode === 'static'
  const preferSilent = opts.analyzerMode === 'json' || opts.analyzerMode === 'static'

  const b = arena()

  const plugin: Plugin<AnalyzerPluginInternalAPI> = {
    name: 'vite-bundle-anlyzer',
    apply: 'build',
    enforce: 'post',
    api: {
      store,
      processModule: () => analyzerModule.processModule()
    },
    config(config) {
      // For some reason, like `vitepress`,`vuepress` and other static site generator etc. They might use the same config object
      // for multiple build process. So we should ensure the sourcemap option is set correctly.
      if (!config.build) {
        config.build = {}
      }
      if ('sourcemap' in config.build && !store.hasSetupSourcemapOption) {
        store.lastSourcemapOption = typeof config.build.sourcemap === 'boolean'
          ? config.build.sourcemap
          : config.build.sourcemap === 'hidden'
        if (config.build.sourcemap === 'inline') {
          // verbose the warning
          console.warn('vite-bundle-analyzer: sourcemap option is set to `inline`, it might cause the result inaccurate.')
        }
      }
      if (config.build) {
        if (typeof config.build.sourcemap === 'boolean') {
          config.build.sourcemap = true
        } else {
          config.build.sourcemap = 'hidden'
        }
        analyzerDebug(`plugin status is ${config.build.sourcemap ? ansis.green('ok') : ansis.red('invalid')}`)
      }
      store.hasSetupSourcemapOption = true
      return config
    },
    configResolved(config) {
      defaultWd = path.resolve(config.root, config.build.outDir ?? '')
      logger = config.logger
      workspaceRoot = searchForWorkspaceRoot(config.root)
      analyzerModule.workspaceRoot = workspaceRoot
      if (opts.summary) {
        const reporter = config.plugins.find((plugin) => plugin.name === 'vite:reporter')
        hasViteReporter = !!reporter?.writeBundle
        if (reporter?.writeBundle) {
          const originalFunction = typeof reporter.writeBundle === 'function'
            ? reporter.writeBundle
            : reporter.writeBundle?.handler
          const fn: Plugin['writeBundle'] = async function writeBundle(...args) {
            await originalFunction?.apply(this, args)
            logger.info(generateSummaryMessage(analyzerModule.modules))
          }

          if (typeof reporter.writeBundle !== 'function') {
            reporter.writeBundle.handler = fn
          } else {
            reporter.writeBundle = fn
          }
        }
      }
    },
    async generateBundle(_, outputBundle) {
      analyzerModule.installPluginContext(this)
      analyzerModule.setupRollupChunks(outputBundle)
      // const cleanup: Array<{ bundle: OutputChunk | OutputAsset, sourcemapFileName: string | undefined }> = []
      // After consider. I trust process chunk is enough. (If you don't think it's right. PR welcome.)
      // A funny thing is that 'Import with Query Suffixes' vite might think the worker is assets
      // So we should wrapper them as a chunk node.
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        await analyzerModule.addModule(bundle)
      }
      if (!store.lastSourcemapOption) {
        // https://262.ecma-international.org/5.1/#sec-12.6.4
        for (const bundleName in outputBundle) {
          const bundle = outputBundle[bundleName]
          if (JS_EXTENSIONS.test(bundle.fileName)) {
            const possiblePath = bundle.fileName + '.map'
            if (possiblePath in outputBundle) {
              Reflect.deleteProperty(outputBundle, possiblePath)
            }
            if (bundle.type === 'chunk') {
              Reflect.deleteProperty(bundle, 'map')
            }
          }
        }
      }
    },
    async closeBundle() {
      if (typeof opts.analyzerMode === 'function') {
        opts.analyzerMode(analyzerModule.processModule())
        return
      }

      if (opts.summary && !hasViteReporter) {
        logger.info(generateSummaryMessage(analyzerModule.modules))
      }
      const analyzeModule = analyzerModule.processModule()
      callCount++

      if (preferSilent) {
        const output = 'fileName' in opts ? opts.fileName : 'stats'
        let p = path.join(defaultWd, `${output}.${opts.analyzerMode === 'json' ? 'json' : 'html'}`)
        if (fs.existsSync(p)) {
          p = path.join(defaultWd, `${output}-${callCount}.${opts.analyzerMode === 'json' ? 'json' : 'html'}`)
        }
        if (opts.analyzerMode === 'json') {
          return fsp.writeFile(p, JSON.stringify(analyzeModule, null, 2), 'utf8')
        }
        const html = await renderView(analyzeModule, { title: reportTitle, mode: opts.defaultSizes || 'stat' })
        await fsp.writeFile(p, html, 'utf8')
        b.into(html)
        if (opts.analyzerMode === 'static' && !opts.openAnalyzer) {
          return
        }
      }

      if (preferLivingServer) {
        callCount--
        const html = await renderView(analyzeModule, { title: reportTitle, mode: opts.defaultSizes || 'stat' })
        b.into(html)
        const port = await ensureEmptyPort(
          'analyzerPort' in opts
            ? opts.analyzerPort === 'auto'
              ? 0
              : (opts.analyzerPort || 0)
            : 8888 + callCount
        )
        const server = createServer()
        server.get('/', (c) => {
          c.res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf8;',
            'content-Encoding': 'gzip'
          })
          b.rs.pipe(zlib.createGzip()).pipe(c.res)
          b.refresh()
        })

        server.listen(port, () => {
          console.log('server run on ', ansis.hex('#5B45DE')(`http://localhost:${port}`))
        })
        if (('openAnalyzer' in opts ? opts.openAnalyzer : true) && !isCI) {
          const address = `http://localhost:${port}`
          openBrowser(address)
        }
        callCount++
      }
    }
  }

  return plugin
}

export { analyzer }
export { adapter } from './adapter'
export { analyzer as default }
export type { AnalyzerMode, AnalyzerPluginInternalAPI, AnalyzerPluginOptions, DefaultSizes, Module } from './interface'
export * from './render'
