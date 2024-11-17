import { program } from 'commander'
import ansis from 'ansis'
import type { AnalyzerMode, DefaultSizes } from './server/interface'
import { analyzer } from './server'

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

const DEFAULT_SIZES_TEXT = 'Default size type. Should be `stat` , `parsed` or `gzip`.'

const SUMMARY_TEXT = 'Show full chunk info to stdout.'

interface Options {
  mode: AnalyzerMode
  filename: string
  port: string
  reportTitle: string
  open: boolean
  defaultSizes: DefaultSizes
  summary: boolean
  config: string
}

function loadVite() {
  try {
    return import('vite')
  } catch (e) {
    throw new Error('Cannot find vite')
  }
}

async function main(opts: Options) {
  const { config, mode: analyzerMode, filename: fileName, port, ...rest } = opts
  const vite = await loadVite()
  await vite.build({ configFile: config, plugins: [analyzer({ analyzerMode, fileName, analyzerPort: +port, ...rest })] })
}

program
  .option('-m, --mode <mode>', MODE_TEXT, 'server')
  .option('-f, --filename <filename>', FILENAME_TEXT, 'stats')
  .option('-p, --port <port>', PORT_TEXT, '8888')
  .option('-t, --reportTitle [title]', REPORT_TITLE_TEXT, 'vite-bundle-analyzer')
  .option('-o, --open [bool]', OPEN_TEXT, true)
  .option('-d, --defaultSizes <string>', DEFAULT_SIZES_TEXT, 'stat')
  .option('-s, --summary [bool]', SUMMARY_TEXT, true)
  .requiredOption('-c, --config <path>', 'Path to vite config file')
  .action(main)

program.parse(process.argv)
