// connect wasm module to the server
// wasm source code is in zig directory
import { type FilterPattern, createFilter } from '@rollup/pluginutils'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import { Writer } from '../../zig/kw'
import type { OutputAsset, OutputBundle, OutputChunk } from './interface'
import { createBrotil, createGzip, isSourceMap } from './shared'

export interface ConnectZlibOptions {
  gzip?: ZlibOptions
  brotli?: BrotliOptions
}

export interface ConnectOptions {
  zlib?: ConnectZlibOptions
  include?: FilterPattern
  exclude?: FilterPattern
  pathFormatter?: (path: string, defaultWD: string) => string
}

export interface SourceMapV3 {
  file?: string | null
  names: string[]
  sourceRoot?: string
  sources: (string | null)[]
  sourcesContent?: (string | null)[]
  version: 3
  ignoreList?: number[]
  mappings: string
}

export type ChunkLike = OutputChunk | OutputAsset

function createZlibAlgorithm(opt: ConnectOptions) {
  const { gzip, brotli } = opt.zlib || {}
  return {
    gzip: createGzip(gzip),
    brotli: createBrotil(brotli)
  }
}

function findSourcemap(filename: string, sourcemapFileName: string, chunks: OutputBundle) {
  if (sourcemapFileName in chunks) { return ((chunks[sourcemapFileName] as OutputAsset).source) as string }
  throw new Error(`[analyzer error]: Missing sourcemap for ${filename}.`)
}

export const JS_EXTENSIONS = /\.(c|m)?js$/

// Note: we process module with kw protocol
// isChunk: bool
// filename: string
// code(resource): string
// isEntry: bool (optional, only for chunk)
// map: struct (optional, only for chunk)
// map: mappings, sources, sourcesContent, names
function createUnifiedModule(chunk: ChunkLike, chunks: OutputBundle) {
  if (chunk.type === 'asset' && !JS_EXTENSIONS.test(chunk.fileName)) {
    let cap = typeof chunk.source === 'string' ? chunk.source.length : chunk.source.byteLength
    cap += chunk.fileName.length
    // for other fields and protocol overhead
    const writer = new Writer(cap + 20)
    writer.encode(false)
    writer.encode(chunk.fileName)
    writer.encode(chunk.source)
    return writer.dupe()
  }
  let sourcemap = ''

  if (JS_EXTENSIONS.test(chunk.fileName)) {
    if ('sourcemapFileName' in chunk) {
      if (chunk.sourcemapFileName && chunk.sourcemapFileName in chunks) {
        sourcemap = findSourcemap(chunk.fileName, chunk.sourcemapFileName, chunks)
      }
    }
    if (!sourcemap) {
      const possiblePath = chunk.fileName + '.map'
      if (possiblePath in chunks) {
        sourcemap = findSourcemap(chunk.fileName, possiblePath, chunks)
      }
    }
  }

  const code = chunk.type === 'asset' ? chunk.source : chunk.code
  const writer = new Writer(code.length + chunk.fileName.length + sourcemap.length + 20)
  writer.encode(true)
  writer.encode(chunk.fileName)
  writer.encode(code)
  writer.encode(chunk.type === 'chunk' && chunk.isEntry)

  const sourceMap = JSON.parse(sourcemap) as SourceMapV3

  //  version, file, sourceRoot – not needed, skip

  writer.encode(sourceMap.mappings || '')
  writer.encode(sourceMap.sources || '')
  writer.encode(sourceMap.sourcesContent || [])
  writer.encode(sourceMap.names || [])

  return writer.dupe()
}

export function creatConnect(options: ConnectOptions = {}) {
  let z: ReturnType<typeof import('../../zig/bindings').create> | undefined = undefined

  const algorithm = createZlibAlgorithm(options)

  let chunks: OutputBundle = {}

  const matcher = createFilter(options.include, options.exclude)

  const pathFormatter = options.pathFormatter || ((path: string) => path)

  const init = async () => {
    if (z) { return }
    const zig = await import('../../zig/bindings')
    z = zig.create({
      algorithm,
      matcher,
      pathFormatter
    })
  }

  const append = (chunk: ChunkLike) => {
    if (!z) { throw new Error('Zig module is not initialized.') }
    if (isSourceMap(chunk.fileName) || !matcher(chunk.fileName)) {
      return
    }

    const module = createUnifiedModule(chunk, chunks)

    z.process(module)
  }

  const prepareChunks = (outputChunks: OutputBundle, watchMode: boolean) => {
    if (watchMode) {
      chunks = {}
    }
    Object.assign(chunks, outputChunks)
  }

  const generateResult = () => {
    if (!z) { throw new Error('Zig module is not initialized.') }
    return z.generate()
  }

  return {
    init,
    append,
    prepareChunks,
    generateResult
  }
}

export type ConnectContext = ReturnType<typeof creatConnect>
