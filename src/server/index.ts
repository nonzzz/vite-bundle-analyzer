import path from 'path'
import type { Logger, Plugin } from 'vite'
import ansis from 'ansis'
import { opener } from './opener'
import { arena, createServer, renderView } from './render'
import { searchForWorkspaceRoot } from './search-root'
import type { AnalyzerPluginOptions, AnalyzerStore, OutputAsset, OutputBundle, OutputChunk } from './interface'
import { AnalyzerNode, createAnalyzerModule } from './analyzer-module'
import { analyzerDebug, convertBytes, fsp } from './shared'

const isCI = !!process.env.CI

const defaultOptions: AnalyzerPluginOptions = {
  analyzerMode: 'server',
  defaultSizes: 'stat',
  summary: true
}

function openBrowser(address: string) {
  opener([address])
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

function validateChunk(chunk: OutputAsset | OutputChunk, allChunks: OutputBundle): [boolean, string | null] {
  const { type } = chunk
  if (type === 'asset' && path.extname(chunk.fileName) === '.js') {
    const possiblePath = chunk.fileName + '.map'
    if (possiblePath in allChunks) return [true, possiblePath]
    return [true, null]
  }
  const isChunk = type === 'chunk'
  return [isChunk, isChunk ? chunk.sourcemapFileName : null]
}

function analyzer(opts?: AnalyzerPluginOptions): Plugin {
  opts = { ...defaultOptions, ...opts }

  const { reportTitle = 'vite-bundle-analyzer' } = opts
  const analyzerModule = createAnalyzerModule(opts?.gzipOptions)
  const store: AnalyzerStore = {
    previousSourcemapOption: false,
    hasSetSourcemapOption: false,
    analyzerModule
  }
  let defaultWd = process.cwd()
  let hasViteReporter = true
  let logger: Logger
  let workspaceRoot = process.cwd()
  const preferOpenServer = opts.analyzerMode === 'server' || opts.analyzerMode === 'static'
  const preferSilent = opts.analyzerMode === 'json' || (opts.analyzerMode === 'static' && !opts.openAnalyzer)

  const b = arena()

  const plugin = <Plugin> {
    name: 'vite-bundle-anlyzer',
    apply: 'build',
    enforce: 'post',
    api: {
      store
    },
    configResolved(config) {
      defaultWd = path.resolve(config.root, config.build.outDir ?? '')
      logger = config.logger
      workspaceRoot = searchForWorkspaceRoot(config.root)
      analyzerModule.workspaceRoot = workspaceRoot
      if (opts.summary) {
        const reporter = config.plugins.find(plugin => plugin.name === 'vite:reporter')
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
      // Alough it's not a good practice to modify the config object directly, but it's the only way to make it work.
      // If you have a better solution, please PR.
      // const isrepated = config.plugins.

      if (!store.hasSetSourcemapOption) {
        store.hasSetSourcemapOption = true
        if (config.build?.sourcemap) {
          store.previousSourcemapOption = typeof config.build.sourcemap === 'boolean'
            ? config.build.sourcemap
            : config.build.sourcemap === 'hidden'
        }
        if (typeof config.build.sourcemap === 'boolean' && config.build.sourcemap) {
          config.build.sourcemap = true
        } else {
          // force set sourcemap to ensure the result as accurate as possible.
          config.build.sourcemap = 'hidden'
        }
        analyzerDebug('Sourcemap option is set to ' + "'" + config.build.sourcemap + "'")
      }
    },
    async generateBundle(_, outputBundle) {
      analyzerModule.installPluginContext(this)
      analyzerModule.setupRollupChunks(outputBundle)
      // After consider. I trust process chunk is enough. (If you don't think it's right. PR welcome.)
      // A funny thing is that 'Import with Query Suffixes' vite might think the worker is assets
      // So we should wrapper them as a chunk node.
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        const [pass, sourcemapFileName] = validateChunk(bundle, outputBundle)
        const sourceMapStatus = sourcemapFileName ? true : false
        analyzerDebug(
          'Processing chunk ' + "'" + bundle.fileName + "'." + 'Chunk status: ' + pass + '. ' + 'Sourcemap status: ' + sourceMapStatus + '.'
        )
        if (pass && sourcemapFileName) {
          await analyzerModule.addModule(bundle, sourcemapFileName)
        }
        if (!store.previousSourcemapOption) {
          if (pass && sourcemapFileName) {
            Reflect.deleteProperty(outputBundle, sourcemapFileName)
          }
        }
      }
    },
    async closeBundle() {
      if (opts.summary && !hasViteReporter) {
        logger.info(generateSummaryMessage(analyzerModule.modules))
      }
      analyzerDebug('Finish analyze bundle.' + analyzerModule.modules.length + ' chunks found.')
      const analyzeModule = analyzerModule.processModule()

      if (preferSilent) {
        const output = 'fileName' in opts ? opts.fileName : 'stats'
        const p = path.join(defaultWd, `${output}.${opts.analyzerMode === 'json' ? 'json' : 'html'}`)
        if (opts.analyzerMode === 'json') {
          return fsp.writeFile(p, JSON.stringify(analyzeModule, null, 2), 'utf8')
        }
        const html = await renderView(analyzeModule, { title: reportTitle, mode: opts.defaultSizes || 'stat' })
        fsp.writeFile(p, html, 'utf8')
        b.into(html)
      }

      if (preferOpenServer) {
        const html = await renderView(analyzeModule, { title: reportTitle, mode: opts.defaultSizes || 'stat' })
        b.into(html)
        const { setup, port } = await createServer(
          'analyzerPort' in opts
            ? opts.analyzerPort === 'auto'
              ? 0
              : opts.analyzerPort
            : 8888
        )
        setup({ title: reportTitle, mode: 'stat', arena: b })
        if (('openAnalyzer' in opts ? opts.openAnalyzer : true) && !isCI) {
          const address = `http://localhost:${port}`
          openBrowser(address)
        }
        return
      }

      throw new Error('Invalidate Option `analyzerMode`')
    }
  }

  return plugin
}

export { analyzer }
export { adapter } from './adapter'
export { analyzer as default }
export type { AnalyzerPluginOptions } from './interface'
