// This is a experminal implementation of Zig's version
// Is to replace the previous TypeScript implementation with a memory-friendly design.
// Note: we using little endian throughout this implementation.

interface WASMInstance {
  memory: WebAssembly.Memory
  scan_source_map_imports_binary: (sourcemap_pascal_ptr: number, sourcemap_pascal_len: number, result_len_ptr: number) => number
  scan_source_map_imports: (sourcemap_pascal_ptr: number, sourcemap_pascal_len: number, result_len_ptr: number) => number
  alloc(size: number): number
  free(ptr: number, size: number): void
}

declare const b64: string

let WASM_CTX: WASMInstance | null = null

const encoder = new TextEncoder()

const decoder = new TextDecoder()

const writeBuffer = new ArrayBuffer(4)
const writeView = new DataView(writeBuffer)
const writeArray = new Uint8Array(writeBuffer)

function write(target: Uint8Array, offset: number, value: number): number {
  writeView.setUint32(0, value >>> 0, true)
  target[offset] = writeArray[0]
  target[offset + 1] = writeArray[1]
  target[offset + 2] = writeArray[2]
  target[offset + 3] = writeArray[3]
  return 4
}

type EncodedPair = { key: Uint8Array, val: Uint8Array }

type PascalStringEntry = [string, Uint8Array | string]

// [count:u32][(len:u32, bytes)...]
const pascal = {
  string(entries: PascalStringEntry[]) {
    const cache = new Array(entries.length) as EncodedPair[]
    let total = 0

    for (let i = 0; i < entries.length; i++) {
      const [k, v] = entries[i]
      const key = encoder.encode(k)
      const val = typeof v === 'string' ? encoder.encode(v) : v
      cache[i] = { key, val }
      total += 8 + key.byteLength + val.byteLength
    }

    const out = new Uint8Array(total)
    let pos = 0

    for (const { key, val } of cache) {
      pos += write(out, pos, key.byteLength)
      out.set(key, pos)
      pos += key.byteLength

      pos += write(out, pos, val.byteLength)
      out.set(val, pos)
      pos += val.byteLength
    }

    return out
  },

  array(data: (string | Uint8Array | null | undefined)[]) {
    const encoded = new Array(data.length) as Uint8Array[]
    let bodyLen = 0

    for (let i = 0; i < data.length; i++) {
      const it = data[i]
      const bytes = typeof it === 'string'
        ? encoder.encode(it)
        : it instanceof Uint8Array
        ? it
        : new Uint8Array(0)
      encoded[i] = bytes
      bodyLen += 4 + bytes.byteLength
    }

    const out = new Uint8Array(4 + bodyLen)
    let pos = 0

    pos += write(out, pos, data.length)

    for (const bytes of encoded) {
      pos += write(out, pos, bytes.byteLength)
      out.set(bytes, pos)
      pos += bytes.byteLength
    }

    return out
  }
}

interface SourceMapV3 {
  file?: string | null
  names: string[]
  sourceRoot?: string
  sources: (string | null)[]
  sourcesContent?: (string | null)[]
  version: 3
  ignoreList?: number[]
  mappings: string
}

function encodeSourceMapV3AsPascalString(rawSourceMap: string): Uint8Array {
  const entries: PascalStringEntry[] = []
  const sourceMap = JSON.parse(rawSourceMap) as unknown as SourceMapV3

  if (sourceMap.version === 3) {
    entries.push(['version', '3'])
  }

  if (sourceMap.file) {
    entries.push(['file', sourceMap.file])
  }

  if (sourceMap.sourceRoot) {
    entries.push(['sourceRoot', sourceMap.sourceRoot])
  }
  if (sourceMap.mappings) {
    entries.push(['mappings', sourceMap.mappings])
  }

  if (sourceMap.sources && Array.isArray(sourceMap.sources)) {
    entries.push(['sources', pascal.array(sourceMap.sources)])
  }

  if (sourceMap.names && Array.isArray(sourceMap.names)) {
    entries.push(['names', pascal.array(sourceMap.names)])
  }

  if (sourceMap.sourcesContent && Array.isArray(sourceMap.sourcesContent)) {
    entries.push(['sourcesContent', pascal.array(sourceMap.sourcesContent)])
  }
  return pascal.string(entries)
}

function loadWASM() {
  if (WASM_CTX) {
    return WASM_CTX
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const compiledWASM = new WebAssembly.Module(bytes)

  WASM_CTX = new WebAssembly.Instance(compiledWASM).exports as unknown as WASMInstance

  return WASM_CTX
}

export function init() {
  loadWASM()
}

export interface ScanSourceMapImportEntry {
  index: number
  source: string
  static: string[]
  dynamic: string[]
}

export function scanSourceMapImportsForSourceContent(rawSourceMap: string) {
  const pascal = encodeSourceMapV3AsPascalString(rawSourceMap)

  if (!WASM_CTX) {
    throw new Error('WASM not initialized')
  }

  const lenPtr = WASM_CTX.alloc(4)

  if (lenPtr === 0) {
    throw new Error('WASM alloc failed')
  }
  const ptr = WASM_CTX.alloc(pascal.byteLength)

  if (ptr === 0) {
    throw new Error('WASM alloc failed')
  }
  new Uint8Array(WASM_CTX.memory.buffer, ptr, pascal.byteLength).set(pascal)
  try {
    const outPtr = WASM_CTX.scan_source_map_imports(ptr, pascal.byteLength, lenPtr)

    if (outPtr === 0) {
      return []
    }

    const outLen = new DataView(WASM_CTX.memory.buffer, lenPtr, 4).getUint32(0, true)

    const outBytes = new Uint8Array(WASM_CTX.memory.buffer, outPtr, outLen)

    const copy = new Uint8Array(outBytes)

    WASM_CTX.free(outPtr, outLen)

    const str = decoder.decode(copy)

    return JSON.parse(str) as ScanSourceMapImportEntry[]
  } finally {
    WASM_CTX.free(ptr, pascal.byteLength)
  }
}
