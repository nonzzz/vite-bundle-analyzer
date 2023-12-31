import path from 'path'
import fsp from 'fs/promises'
import type { Logger, Plugin } from 'vite'
import colors from 'picocolors'
import { name } from '../../package.json'
import { renderView } from './render'
import type { AnalyzerPluginOptions } from './interface'
import { type AnalyzerNode, createAnalyzerModule } from './analyzer-module'
import { createServer } from './server'
import { convertBytes } from './shared'

const isCI = !!process.env.CI

async function openBrowser(address: string) {
  await import('open').then((module) => module.default(address, { newInstance: true })).catch(() => {})
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

function analyzer(opts: AnalyzerPluginOptions = { analyzerMode: 'server', summary: true }): Plugin {
  const { reportTitle = name } = opts
  const analyzerModule = createAnalyzerModule(opts?.gzipOptions)
  let defaultWd = process.cwd()
  let previousSourcemapOption: boolean = false
  let hasViteReporter = true
  let logger: Logger
  const plugin = <Plugin>{
    name,
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      defaultWd = config.build.outDir ?? config.root
      logger = config.logger
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
        previousSourcemapOption = typeof config.build.sourcemap === 'boolean'
          ? config.build.sourcemap
          : config.build.sourcemap === 'hidden'
      }
      if (!config.build) {
        config.build = {}
      }
      // force set sourcemap to ensure the result as accurate as possible.
      config.build.sourcemap = 'hidden'
    },
    async generateBundle(_, outputBundle) {
      analyzerModule.installPluginContext(this)
      // After consider. I trust process chunk is enough. (If you don't think it's right. PR welcome.)
      for (const bundleName in outputBundle) {
        const bundle = outputBundle[bundleName]
        if (bundle.type !== 'chunk') continue
        await analyzerModule.addModule(bundleName, bundle)
        if (!previousSourcemapOption && bundle.sourcemapFileName) {
          Reflect.deleteProperty(outputBundle, bundle.sourcemapFileName)
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
          fsp.writeFile(p, JSON.stringify(foamModule, null, 2), 'utf8')
          break
        }
        case 'static': {
          const p = path.join(defaultWd, opts.fileName ? `${opts.fileName}.html` : 'stats.html')
          const foamModule = analyzerModule.processFoamModule()
          const html = await renderView(foamModule, { title: reportTitle, mode: 'stat' })
          fsp.writeFile(p, html, 'utf8')
          break
        }
        case 'server': {
          const foamModule = analyzerModule.processFoamModule()
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
