// I verified the excellent performance of zig wasm in previous versions
// so I believe that providing a higher-level binding is a better choice.

import type { InputType } from 'zlib'

interface WASMInstance {
  memory: WebAssembly.Memory
  alloc(size: number): number
  free(ptr: number, size: number): void
  process(data_ptr: number, data_len: number): void
}

export interface BindingOptions {
  pathFormatter: (path: string, defaultWD: string) => string
  matcher: (id: unknown) => boolean
  algorithm: {
    gzip: (input: InputType) => Promise<Buffer<ArrayBufferLike>>,
    brotli: (input: Uint8Array) => Promise<Buffer<ArrayBufferLike>>
  }
}

interface BindingEnviorment extends WebAssembly.ModuleImports {
  calc_compressed_size: (input_ptr: number, input_len: number, algorithm: number) => number
  is_match: (id_ptr: number, id_len: number) => number
  format_path: (path_ptr: number, path_len: number, defaultWD_ptr: number, defaultWD_len: number) => number
  _init_memory: (memory: WebAssembly.Memory) => void
}

declare const b64: string

let COMPILED_WASM: WebAssembly.Module | null = null

function loadWASM() {
  if (COMPILED_WASM) {
    return COMPILED_WASM
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

  COMPILED_WASM = new WebAssembly.Module(bytes)

  return COMPILED_WASM
}

function registerEnviorment(options: BindingOptions) {
  // cross-platform is detrimental to performance.
  // So we wrap js side function as batch operations and pass them to zig side as callback.
  // Note: all of the data is base on kw protocol
  let memory: WebAssembly.Memory | null = null
  return <BindingEnviorment> {
    calc_compressed_size: (input_ptr: number, input_len: number, algorithm: number) => {
      console.log(memory, options)
    },
    is_match(id_ptr, id_len) {
      console.log(memory, options)
    },
    format_path(path_ptr, path_len, defaultWD_ptr, defaultWD_len) {
      console.log(memory, options)
    },
    _init_memory(mem: WebAssembly.Memory) {
      memory = mem
    }
  }
}

export function create(options: BindingOptions) {
  const env = registerEnviorment(options)
  const instance = new WebAssembly.Instance(loadWASM(), { env })

  const exports = instance.exports as unknown as WASMInstance
  env._init_memory(exports.memory)

  return { process: process.bind(exports), generate: generate.bind(exports) }
}

// define the type of struct in src/server/connect.ts for correct encoding/decoding in zig side
function process(this: WASMInstance, data: Uint8Array) {
  const ptr = this.alloc(data.length)

  if (ptr === 0) {
    throw new Error('Failed to allocate memory in WASM.')
  }

  new Uint8Array(this.memory.buffer, ptr, data.length).set(data)

  this.process(ptr, data.length)
}

function generate(this: WASMInstance) {
}
