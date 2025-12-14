import ansis from 'ansis'
import fs from 'fs'
import mri from 'mri'
import path from 'path'
import { searchForPackageRoot, searchForWorkspaceRoot } from 'workspace-sieve'
import { detectPackageManager, getSearchPaths, resolveEntryPoint, resolveWithNodeResolution } from './scan'
import { analyzer } from './server'
import type { AnalyzerMode, DefaultSizes } from './server/interface'
import { analyzerDebug } from './server/shared'

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

const DEFAULT_SIZES_TEXT = 'Default size type. Should be `stat`, `gzip` or `brotli`.'

const SUMMARY_TEXT = 'Show full chunk info to stdout.'

const PATTERN_INCLUDE_TEXT = 'Include all assets matching any of these conditions'

const PATTERN_EXCLUDE_TEXT = 'Exclude all assets matching any of these conditions.'

interface Options {
  mode: AnalyzerMode
  filename: string
  port: string
  reportTitle: string
  open: boolean
  defaultSizes: DefaultSizes
  summary: boolean
  config: string
  engine: 'vite' | 'rolldown-vite'
}

const defaultWd = process.cwd()

function searchForPackageInNodeModules(name: string, searchRoot: string) {
  const nodeModulesPath = path.join(searchRoot, 'node_modules', name)

  if (fs.existsSync(nodeModulesPath)) {
    const packageJsonPath = path.join(nodeModulesPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      return nodeModulesPath
    }
  }

  return null
}

// Desgin for type: module
// I know @dual-bundle/import-meta-resolve but i won't use it. We only need to import package not relative path.
function importMetaResolve(name: string) {
  const workspaceRoot = searchForWorkspaceRoot(defaultWd)
  const packageManager = detectPackageManager(workspaceRoot)

  analyzerDebug(`Resolving '${name}' in ${packageManager} workspace at '${workspaceRoot}'`)

  let packageRoot: string | null = null

  const searchPaths = getSearchPaths(workspaceRoot, packageManager)

  for (const searchPath of searchPaths) {
    packageRoot = searchForPackageInNodeModules(name, searchPath)
    if (packageRoot) {
      analyzerDebug(`Found package '${name}' at '${packageRoot}' via standard search`)
      break
    }
  }

  if (!packageRoot) {
    analyzerDebug(`Falling back to Node.js resolution for '${name}'`)

    try {
      return resolveWithNodeResolution(name, workspaceRoot)
    } catch (error) {
      try {
        return resolveWithNodeResolution(name, process.cwd())
      } catch {
        if (error instanceof Error) {
          throw new Error(
            `Can not find module '${name}' in ${packageManager} workspace at '${workspaceRoot}'. ` +
              `Searched paths: ${searchPaths.join(', ')}. ` +
              `Resolution error: ${error.message}`
          )
        }
      }
    }
  }

  if (!packageRoot) {
    throw new Error(`Can not find module '${name}' in '${workspaceRoot}'`)
  }
  return resolveEntryPoint(packageRoot, name)
}

function loadVite(engine: 'vite' | 'rolldown-vite' = 'vite'): Promise<typeof import('vite')> {
  return import(importMetaResolve(engine))
}

const FILE_EXTENSIONS = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts']

function findCurrentViteConfgFile(inputPath: string) {
  if (inputPath) { return inputPath }
  const root = searchForPackageRoot(process.cwd())
  for (const ext of FILE_EXTENSIONS) {
    const p = path.join(root, 'vite.config' + '.' + ext)
    if (fs.existsSync(p)) {
      return p
    }
  }
  throw new Error('Missing Vite configuration file. Use --config <path> to specify location')
}

async function main(opts: Options) {
  const { engine, config, mode: analyzerMode, filename: fileName, port, open, summary, ...rest } = opts
  const configFile = findCurrentViteConfgFile(config)
  const vite = await loadVite(engine)
  await vite.build({
    configFile,
    plugins: [
      analyzer({ analyzerMode, fileName, openAnalyzer: open, summary, analyzerPort: +port, ...rest })
    ]
  })
}

interface CommanderOption {
  alias: string
  desc: string
  default: unknown
  flag?: string
}

export const OPTIONS: Record<string, CommanderOption> = {
  mode: {
    alias: 'm',
    desc: MODE_TEXT,
    default: 'server',
    flag: '<mode>'
  },
  filename: {
    alias: 'f',
    desc: FILENAME_TEXT,
    default: 'stats'
  },
  port: {
    alias: 'p',
    desc: PORT_TEXT,
    default: '8888',
    flag: '<port>'
  },
  reportTitle: {
    alias: 't',
    desc: REPORT_TITLE_TEXT,
    default: 'vite-bundle-analyzer',
    flag: '[title]'
  },
  open: {
    alias: 'o',
    desc: OPEN_TEXT,
    default: true,
    flag: '[bool]'
  },
  defaultSizes: {
    alias: 'd',
    desc: DEFAULT_SIZES_TEXT,
    default: 'stat',
    flag: '<string>'
  },
  summary: {
    alias: 's',
    desc: SUMMARY_TEXT,
    default: true,
    flag: '[bool]'
  },
  config: {
    alias: 'c',
    desc: 'Path to vite config file. Automic search for vite configuration in your current workspace.',
    default: '',
    flag: '<path>'
  },
  include: {
    alias: 'include',
    desc: PATTERN_INCLUDE_TEXT,
    default: [],
    flag: '<string>'
  },
  exclude: { alias: 'exclude', desc: PATTERN_EXCLUDE_TEXT, default: [], flag: '<string>' },
  engine: {
    alias: 'e',
    desc: 'Specify the bundle engine for cli. Can be `vite`, `rolldown-vite`.',
    default: 'vite',
    flag: '<string>'
  }
}

const argv = mri<Options & { help?: string, h?: string }>(process.argv.slice(2), {
  alias: Object.fromEntries(Object.entries(OPTIONS).map(([key, { alias }]) => [alias, key])),
  default: Object.fromEntries(Object.entries(OPTIONS).map(([key, { default: value }]) => [key, value])),
  boolean: ['open', 'summary']
})

function preferText<T>(value: T) {
  if (value === undefined || value === null) {
    return ''
  }
  switch (typeof value) {
    case 'boolean':
      return value.toString()
    case 'number':
      return value.toString()
    case 'string':
      return value
    case 'object':
      return '[object]'
    case 'function':
      return '[function]'
    default:
      return ''
  }
}

function printHelp() {
  console.log('Usage: vite-bundle-analyzer [options]' + BREAK_LINE)
  console.log('Options:')
  const maxLen = Object.entries(OPTIONS)
    .map(([key, opt]) => `-${opt.alias}, --${key} ${opt.flag || ''}`)
    .reduce((max, str) => Math.max(max, str.length), 0)
  const textPadding = ' '.repeat(maxLen + 6)
  for (const [key, opt] of Object.entries(OPTIONS)) {
    const option = `-${opt.alias}, --${key} ${opt.flag || ''}`.padEnd(maxLen + 4)
    const defaultCast = opt.default ? ` (default: ${preferText(opt.default)})` : ''
    const lines = opt.desc.split(BREAK_LINE)
    const [firstLine, ...restLines] = lines
    if (!restLines.length) {
      console.log(`  ${option}${firstLine}${defaultCast}`)
      continue
    }
    console.log(`  ${option}${firstLine}`)
    const last = restLines.length - 1
    for (let i = 0; i < restLines.length; i++) {
      const line = restLines[i]
      if (i === last) {
        console.log(`${textPadding}${line}${defaultCast}`)
        break
      }
      console.log(`${textPadding}${line}`)
    }
    console.log('')
  }
}

export function exec() {
  if (argv.h || argv.help) {
    printHelp()
    process.exit(0)
  }
  main(argv).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
