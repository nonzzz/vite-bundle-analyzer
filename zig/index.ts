// This is a experminal implementation of Zig's version
// Is to replace the previous TypeScript implementation with a memory-friendly design.

import { Writer, kwDecode } from './kw'

interface WASMInstance {
  memory: WebAssembly.Memory
  scan_import_stmts_from_code: (code_ptr: number, code_len: number, result_len_ptr: number) => number
  scan_source_map_imports: (sourcemap_ptr: number, sourcemap_len: number, result_len_ptr: number) => number
  pickup_mappings_from_code: (
    code_ptr: number,
    code_len: number,
    sourcemap_ptr: number,
    sourcemap_len: number,
    result_len_ptr: number
  ) => number
  alloc(size: number): number
  free(ptr: number, size: number): void
}

declare const b64: string

let WASM_CTX: WASMInstance | null = null

let SHARED_SOURCEMAP_PTR: number = 0
let SHARED_SOURCEMAP_LEN: number = 0

const encoder = new TextEncoder()

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

// field order must same with sourcemap struct in lib.zig for correct encoding/decoding
export function encodeSourceMapV3(rawSourceMap: string): Uint8Array {
  const sm = JSON.parse(rawSourceMap) as unknown as SourceMapV3

  const writer = new Writer(rawSourceMap.length)

  writer.encode(sm.version ?? 3)
  writer.encode(sm.file ?? '')
  writer.encode(sm.sourceRoot ?? '')
  writer.encode(sm.mappings ?? '')
  writer.encode(sm.sources ?? [])
  writer.encode(sm.sourcesContent ?? [])
  writer.encode(sm.names ?? [])
  return writer.dupe()
}

export interface BundleModule {
  path: string
  parsedSize: number
  gzipSize: number
  brotliSize: number
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

export interface ScanImportStatmentResult {
  static: string[]
  dynamic: string[]
}
export interface ScanSourceMapImportEntry {
  index: number
  source: string
  static: string[]
  dynamic: string[]
}

export function parse(rawSourceMap: string): void {
  if (!WASM_CTX) {
    throw new Error('WASM not initialized. Call init() first.')
  }

  if (SHARED_SOURCEMAP_PTR !== 0) {
    WASM_CTX.free(SHARED_SOURCEMAP_PTR, SHARED_SOURCEMAP_LEN)
    SHARED_SOURCEMAP_PTR = 0
    SHARED_SOURCEMAP_LEN = 0
  }

  const pascalData = encodeSourceMapV3(rawSourceMap)

  SHARED_SOURCEMAP_PTR = WASM_CTX.alloc(pascalData.byteLength)

  if (SHARED_SOURCEMAP_PTR === 0) {
    throw new Error('WASM alloc failed for sourcemap')
  }

  SHARED_SOURCEMAP_LEN = pascalData.byteLength

  new Uint8Array(WASM_CTX.memory.buffer, SHARED_SOURCEMAP_PTR, SHARED_SOURCEMAP_LEN).set(pascalData)
}

export function scanImportStatements(generateCode: string): ScanImportStatmentResult {
  if (!WASM_CTX) {
    throw new Error('WASM not initialized. Call init() first.')
  }

  const codeBytes = encoder.encode(generateCode)
  const codePtr = WASM_CTX.alloc(codeBytes.byteLength)

  if (codePtr === 0) {
    throw new Error('WASM alloc failed for code')
  }

  new Uint8Array(WASM_CTX.memory.buffer, codePtr, codeBytes.byteLength).set(codeBytes)

  const lenPtr = WASM_CTX.alloc(4)

  if (lenPtr === 0) {
    WASM_CTX.free(codePtr, codeBytes.byteLength)
    throw new Error('WASM alloc failed for length pointer')
  }

  try {
    const outPtr = WASM_CTX.scan_import_stmts_from_code(codePtr, codeBytes.byteLength, lenPtr)
    if (outPtr === 0) {
      return { static: [], dynamic: [] }
    }

    const outLen = new DataView(WASM_CTX.memory.buffer, lenPtr, 4).getUint32(0, true)
    const outBytes = new Uint8Array(WASM_CTX.memory.buffer, outPtr, outLen)
    const result = kwDecode(outBytes)
    WASM_CTX.free(outPtr, outLen)

    return result as ScanImportStatmentResult
  } finally {
    WASM_CTX.free(codePtr, codeBytes.byteLength)
    WASM_CTX.free(lenPtr, 4)
  }
}

export function scanSourceMapImportsForSourceContent(): ScanSourceMapImportEntry[] {
  if (!WASM_CTX) {
    throw new Error('WASM not initialized. Call init() first.')
  }

  if (SHARED_SOURCEMAP_PTR === 0) {
    throw new Error('No sourcemap parsed. Call parse() first.')
  }

  const lenPtr = WASM_CTX.alloc(4)

  if (lenPtr === 0) {
    throw new Error('WASM alloc failed for length pointer')
  }

  try {
    const outPtr = WASM_CTX.scan_source_map_imports(SHARED_SOURCEMAP_PTR, SHARED_SOURCEMAP_LEN, lenPtr)

    if (outPtr === 0) {
      return []
    }

    const outLen = new DataView(WASM_CTX.memory.buffer, lenPtr, 4).getUint32(0, true)
    const outBytes = new Uint8Array(WASM_CTX.memory.buffer, outPtr, outLen)
    const result = kwDecode(outBytes)
    WASM_CTX.free(outPtr, outLen)

    return result as ScanSourceMapImportEntry[]
  } finally {
    WASM_CTX.free(lenPtr, 4)
  }
}

export interface PickupMappingsResult {
  grouped: Record<string, { code: string }>
  files: string[]
}

export function pickupMappingsFromCode(generatedCode: string): PickupMappingsResult {
  if (!WASM_CTX) {
    throw new Error('WASM not initialized. Call init() first.')
  }

  if (SHARED_SOURCEMAP_PTR === 0) {
    throw new Error('No sourcemap parsed. Call parse() first.')
  }

  const codeBytes = encoder.encode(generatedCode)
  const codePtr = WASM_CTX.alloc(codeBytes.byteLength)

  if (codePtr === 0) {
    throw new Error('WASM alloc failed for code')
  }

  new Uint8Array(WASM_CTX.memory.buffer, codePtr, codeBytes.byteLength).set(codeBytes)

  const lenPtr = WASM_CTX.alloc(4)

  if (lenPtr === 0) {
    WASM_CTX.free(codePtr, codeBytes.byteLength)
    throw new Error('WASM alloc failed for length pointer')
  }

  try {
    const outPtr = WASM_CTX.pickup_mappings_from_code(
      codePtr,
      codeBytes.byteLength,
      SHARED_SOURCEMAP_PTR,
      SHARED_SOURCEMAP_LEN,
      lenPtr
    )

    if (outPtr === 0) {
      return { grouped: {}, files: [] }
    }

    const outLen = new DataView(WASM_CTX.memory.buffer, lenPtr, 4).getUint32(0, true)
    const outBytes = new Uint8Array(WASM_CTX.memory.buffer, outPtr, outLen)
    const result = kwDecode(outBytes)
    WASM_CTX.free(outPtr, outLen)

    return result as PickupMappingsResult
  } finally {
    WASM_CTX.free(codePtr, codeBytes.byteLength)
    WASM_CTX.free(lenPtr, 4)
  }
}

export function dispose() {
  if (WASM_CTX && SHARED_SOURCEMAP_PTR !== 0) {
    WASM_CTX.free(SHARED_SOURCEMAP_PTR, SHARED_SOURCEMAP_LEN)
    SHARED_SOURCEMAP_PTR = 0
    SHARED_SOURCEMAP_LEN = 0
  }
}

// export function
