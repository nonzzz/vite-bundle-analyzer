import { SourceMapConsumer } from '@jridgewell/source-map'
import fs from 'fs'
import { bench, group, run } from 'mitata'
import path from 'path'
import { init, parse, pickupMappingsFromCode } from '../zig/dist'

const defaultWd = process.cwd()

const BIG_SOURCE_MAP = fs.readFileSync(path.resolve(defaultWd, '__tests__/fixtures/source-map/babylon/babylon.js.map'), 'utf-8')

const BIG_SOURCE_MAP_JS = fs.readFileSync(path.resolve(defaultWd, '__tests__/fixtures/source-map/babylon/babylon.js'), 'utf-8')

function pickupMappingsFromCodeStrJavascript(
  code: string,
  rawSourcemap: string
) {
  const consumer = new SourceMapConsumer(rawSourcemap)
  const grouped: Record<string, { code: string, importedBy: [] }> = {}
  let line = 1
  let column = 0
  const files = new Set()
  for (let i = 0; i < code.length; i++, column++) {
    const { source } = consumer.originalPositionFor({ line, column })
    if (source != null) {
      const id = source

      const char = code[i]

      if (!(id in grouped)) {
        grouped[id] = { importedBy: [], code: '' }
      }
      grouped[id].code += char
      files.add(id)
    }

    if (code[i] === '\n') {
      line += 1
      column = -1
    }
  }

  return { grouped, files }
}

init()

function pickupMappingsFromCodeStrZig(code: string, rawSourcemap: string) {
  parse(rawSourcemap)

  return pickupMappingsFromCode(code)
}

group(() => {
  bench('JavaScript SourceMap', () => pickupMappingsFromCodeStrJavascript(BIG_SOURCE_MAP_JS, BIG_SOURCE_MAP))
  bench('Zig SourceMap', () => pickupMappingsFromCodeStrZig(BIG_SOURCE_MAP_JS, BIG_SOURCE_MAP))
})

await run()
