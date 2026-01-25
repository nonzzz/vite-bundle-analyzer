import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { SourceMapStruct } from '../zig/interface'
import { buildAsPascalString, decodePascalString } from '../zig/pascal'

const defaultWd = process.cwd()

const SOURCE_PASCAL_STRING_FILE = path.join(defaultWd, '__tests__', 'fixtures', 'source-map/index.js.map')

const SOURCE_MAP_FILE = fs.readFileSync(SOURCE_PASCAL_STRING_FILE, 'utf8')

describe('pascal string', () => {
  it('parse', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = JSON.parse(SOURCE_MAP_FILE)
    const pascalString = buildAsPascalString(object)
    const decode = decodePascalString<SourceMapStruct>(pascalString)
    expect(decode.version).toBe('3')
    expect(decode.file).toBe('index-BixsrqKx.js')
  })
})
