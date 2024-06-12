import { SourceMapConsumer } from '@jridgewell/source-map'
import type { ChunkMetadata } from './trie'

// @jridgewell/source-map is an opinionated library
// So we should base on them to implement some missing or different features
// Note: this file is unstable and may be changed in the future.
// If I find a way to ditch the sourcemap
// Refer the following links:
// https://esbuild.github.io/faq/#minified-newlines
// https://github.com/terser/terser/issues/960

export class Sourcemap extends SourceMapConsumer {
  constructor(rawSourceMap: string) {
    super(parse(rawSourceMap), '')
  }
}

function parse(s: string) {
  return JSON.parse(s)
}

// sourcemap is using UTF-16 decoding or encoding the input string
const decoder = new TextDecoder()

export function pickupContentFromSourcemap(rawSourcemap: string) {
  const consumer = new Sourcemap(rawSourcemap)
  const result = consumer.sources.reduce((acc, cur) => {
    if (cur) {
      const code = consumer.sourceContentFor(cur, true)
      if (code) acc.push({ id: cur, code })
    }
    return acc
  }, [] as Array<ChunkMetadata>)
  consumer.destroy()
  return result
}

export function pickupMappingsFromCodeBinary(bytes: Uint8Array, rawSourcemap: string, formatter: (id: string) => string) {
  const consumer = new Sourcemap(rawSourcemap)
  const grouped: Record<string, string> = {}
  let line = 1
  let column = 0
  const code = decoder.decode(bytes)
  for (let i = 0; i < code.length; i++, column++) {
    const { source } = consumer.originalPositionFor({ line, column })
    if (source != null) {
      const id = formatter(source)

      const char = code[i]

      if (!(id in grouped)) {
        grouped[id] = ''
      }
      grouped[id] += char
    }

    if (code[i] === '\n') {
      line += 1
      column = -1
    }
  }
  consumer.destroy()
  return grouped
}
