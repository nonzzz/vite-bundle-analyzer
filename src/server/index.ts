import path from 'path'
import fsp from 'fs/promises'
import type { Logger, Plugin } from 'vite'
import colors from 'picocolors'
import { name } from '../../package.json'
import { opener } from './opener'
import { renderView } from './render'
import { searchForWorkspaceRoot } from './search-root'
import type { AnalyzerPluginOptions, AnalyzerStore, OutputAsset, OutputBundle, OutputChunk } from './interface'
import { type AnalyzerNode, createAnalyzerModule } from './analyzer-module'
import { createServer } from './server'
import { convertBytes } from './shared'

const isCI = !!process.env.CI

function openBrowser(address: string) {
  opener([address])
}

const formatNumber = (number: number | string) => colors.dim(colors.bold(number))

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

function analyzer(opts: AnalyzerPluginOptions = { analyzerMode: 'server', summary: true }): Plugin {
  const { reportTitle = name } = opts
  const analyzerModule = createAnalyzerModule(opts?.gzipOptions)
  const store: AnalyzerStore = {
    previousSourcemapOption: false,
    analyzerModule
  }
  let defaultWd = process.cwd()
  let hasViteReporter = true
  let logger: Logger
  let workspaceRoot = process.cwd()
  const plugin = <Plugin>{
    name,
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
          const fn: Plugin['writeBundle'] = async function (...args) {
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
    config(config) {
      if (config.build?.sourcemap) {
        store.previousSourcemapOption = typeof config.build.sourcemap === 'boolean'
          ? config.build.sourcemap
          : config.build.sourcemap === 'hidden'
      }
      if (!config.build) {
        config.build = {}
      }
      if (typeof config.build.sourcemap === 'boolean' && config.build.sourcemap) {
        config.build.sourcemap = true
      } else {
      // force set sourcemap to ensure the result as accurate as possible.
        config.build.sourcemap = 'hidden'
      }
    },
    async generateBundle(outputOptions, outputBundle) {
      analyzerModule.installPluginContext(this)
      analyzerModule.setupRollupChunks(outputBundle)
      // After consider. I trust process chunk is enough. (If you don't think it's right. PR welcome.)
      // A funny thing is that 'Import with Query Suffixes' vite might think the worker is assets
      // So we should wrapper them as a chunk node.
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        const [pass, sourcemapFileName] = validateChunk(bundle, outputBundle)
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
      switch (opts.analyzerMode) {
        case 'json': {
          const p = path.join(defaultWd, opts.fileName ? `${opts.fileName}.json` : 'stats.json')
          const foamModule = analyzerModule.processFoamModule()
          return fsp.writeFile(p, JSON.stringify(foamModule, null, 2), 'utf8')
        }
        case 'static': {
          const p = path.join(defaultWd, opts.fileName ? `${opts.fileName}.html` : 'stats.html')
          const foamModule = analyzerModule.processFoamModule()
          const html = await renderView(foamModule, { title: reportTitle, mode: 'stat' })
          return fsp.writeFile(p, html, 'utf8')
        }
        case 'server': {
          const foamModule = analyzerModule.processFoamModule()
          const { setup, port } = createServer((opts.analyzerPort === 'auto' ? 0 : opts.analyzerPort) ?? 8888)
          setup(foamModule, { title: reportTitle, mode: 'stat' })
          if ((opts.openAnalyzer ?? true) && !isCI) {
            const address = `http://localhost:${port}`
            openBrowser(address)
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
export { adapter } from './adapter'
export { analyzer as default }
export type { AnalyzerPluginOptions } from './interface'
