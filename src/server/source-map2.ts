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
// 

export function pickupMappingsFromCodeMatrix(bytes: Uint8Array, rawSourcemap: string) {
  // 
}
