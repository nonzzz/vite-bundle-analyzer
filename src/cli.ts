/* eslint-disable no-labels */
import ansis from 'ansis'
import { program } from 'commander'
import fs from 'fs'
import path from 'path'
import url from 'url'
import { analyzer } from './server'
import type { AnalyzerMode, DefaultSizes, ExportFields, PackageJSONMetadata } from './server/interface'
import { searchForWorkspaceRoot } from './server/search-root'

let BREAK_LINE = '\n'

if (process.platform === 'win32') {
  BREAK_LINE = '\r\n'
}

const MODE_TEXT = 'Analyzer modes. Should be `server`, `static` or `json`. ' + BREAK_LINE +
  ansis.green('In `server` mode analyzer will start HTTP server to show bundle report.') + BREAK_LINE +
  ansis.green(
    'In `static` mode single HTML file with bundle report will be generated.(If you use this mode with `openAnalyzer` option also start HTTP server).'
  ) + BREAK_LINE +
  ansis.green('In `json` mode single JSON file with bundle report will be generated.')

const FILENAME_TEXT = 'Output file name. If not specified will be generated automatically.'

const PORT_TEXT = 'Port for HTTP server.'

const REPORT_TITLE_TEXT = 'Title for bundle report.'

const OPEN_TEXT = 'Open report in default browser.'

const DEFAULT_SIZES_TEXT = 'Default size type. Should be `stat` , `parsed` , `gzip` or `brotli`.'

const SUMMARY_TEXT = 'Show full chunk info to stdout.'

interface Options {
  mode: AnalyzerMode
  filename: string
  port: string
  reportTitle: string
  open: boolean | string
  defaultSizes: DefaultSizes
  summary: boolean | string
  config: string
}

const defaultWd = process.cwd()

function searchForPackageInNodeModules(name: string, currentDir: string) {
  let dir = currentDir
  while (dir !== path.parse(dir).root) {
    const potentialPackagePath = path.join(dir, 'node_modules', name)
    if (fs.statSync(potentialPackagePath).isDirectory()) {
      return potentialPackagePath
    }
    dir = path.dirname(dir)
  }
  return null
}

type EntryModule = string | ExportFields | undefined

// Desgin for type: module
// I know @dual-bundle/import-meta-resolve but i won't use it. We only need to import package not relative path.
export function importMetaResolve(name: string) {
  const workspaceRoot = searchForWorkspaceRoot(defaultWd)
  const packageRoot = searchForPackageInNodeModules(name, workspaceRoot)
  if (!packageRoot) {
    throw new Error(`Cannot find module '${name}' in '${workspaceRoot}'`)
  }
  const packageJSONPath = path.join(packageRoot, 'package.json')
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8')) as unknown as PackageJSONMetadata

  let entryPoint: EntryModule = packageJSON.module || packageJSON.main
  const isESM = packageJSON.type === 'module'
  if (packageJSON.exports && !entryPoint) {
    entryPoint = packageJSON.exports['.'] || packageJSON.exports['./index'] || packageJSON.exports['./index.js']
    stop: for (;;) {
      if (typeof entryPoint === 'string') { break stop }
      if (entryPoint) {
        if (isESM) {
          entryPoint = entryPoint.import || entryPoint.default
        } else {
          entryPoint = entryPoint.require || entryPoint.default
        }
      } else {
        break stop
      }
    }
  }
  if (!entryPoint) { throw new Error(`Cannot find entry point for module '${name}'`) }
  entryPoint = path.join(packageRoot, entryPoint)
  if (fs.existsSync(entryPoint) && fs.statSync(entryPoint).isFile()) {
    return url.pathToFileURL(entryPoint).href
  }
  throw new Error(`Cannot resolve entry point for package '${name}'`)
}

function loadVite(): Promise<typeof import('vite')> {
  return import(importMetaResolve('vite'))
}

function parseBool(s: string | boolean) {
  if (typeof s === 'boolean') { return s }
  if (s === 'false') { return false }
  return true
}

async function main(opts: Options) {
  const { config, mode: analyzerMode, filename: fileName, port, open, summary, ...rest } = opts
  const vite = await loadVite()
  await vite.build({
    configFile: config,
    plugins: [
      analyzer({ analyzerMode, fileName, openAnalyzer: parseBool(open), summary: parseBool(summary), analyzerPort: +port, ...rest })
    ]
  })
}

// Based on my test, I found that commander.js can't handle type of boolean. So we should create a parse for it.

program
  .option('-m, --mode <mode>', MODE_TEXT, 'server')
  .option('-f, --filename <filename>', FILENAME_TEXT, 'stats')
  .option('-p, --port <port>', PORT_TEXT, '8888')
  .option('-t, --reportTitle [title]', REPORT_TITLE_TEXT, 'vite-bundle-analyzer')
  .option('-o, --open [bool]', OPEN_TEXT, true)
  .option('-d, --defaultSizes <string>', DEFAULT_SIZES_TEXT, 'stat')
  .option('-s, --summary [bool]', SUMMARY_TEXT, true)
  .option('-c, --config <path>', 'Path to vite config file', 'vite.config.ts')
  .action(main)

program.parse(process.argv)
