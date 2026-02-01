import fs from 'fs'
import path from 'path'

const defaultWD = process.cwd()

const WASM_BINARY_PATH = path.join(defaultWD, 'zig-out', 'scan.wasm')

const WASM_BINARY_B64 = fs.readFileSync(WASM_BINARY_PATH, 'base64')

// @ts-expect-error safe guard for global b64 used in tests
globalThis.b64 = WASM_BINARY_B64
