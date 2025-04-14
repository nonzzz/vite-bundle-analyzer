import { SourceMapConsumer } from '@jridgewell/source-map'
import { byteToString } from './shared'
import type { ChunkMetadata } from './trie'

// @jridgewell/source-map cut to reduce the size of the bundle
// Only have sourceContentFor and originalPositionFor methods

export function pickupContentFromSourcemap(rawSourcemap: string) {
  if (!rawSourcemap) { return [] }
  const consumer = new SourceMapConsumer(rawSourcemap)

  const result = consumer.sources.reduce((acc, cur) => {
    if (cur) {
      const code = consumer.sourceContentFor(cur, true)
      if (code) { acc.push({ id: cur, code }) }
    }
    return acc
  }, [] as Array<ChunkMetadata>)
  return result
}

export function pickupMappingsFromCodeBinary(bytes: Uint8Array, rawSourcemap: string, formatter: (id: string) => string) {
  const consumer = new SourceMapConsumer(rawSourcemap)
  const grouped: Record<string, string> = {}
  const files = new Set<string>()
  let line = 1
  let column = 0
  const code = byteToString(bytes)
  for (let i = 0; i < code.length; i++, column++) {
    const { source } = consumer.originalPositionFor({ line, column })
    if (source != null) {
      const id = formatter(source)

      const char = code[i]

      if (!(id in grouped)) {
        grouped[id] = ''
      }
      grouped[id] += char
      files.add(id)
    }

    if (code[i] === '\n') {
      line += 1
      column = -1
    }
  }
  return { grouped, files }
}
