import ansis from 'ansis'
import { noop } from 'foxact/noop'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import utils from 'util'
import zlib from 'zlib'
import type { BrotliOptions, InputType, ZlibOptions } from 'zlib'

export * from '../shared'

export const fsp = fs.promises
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const gzip = utils.promisify(zlib.gzip)
const brotli = utils.promisify(zlib.brotliCompress)

const defaultGzipOptions = <ZlibOptions> {
  level: zlib.constants.Z_DEFAULT_LEVEL
}

const defaultBrotliOptions = <BrotliOptions> {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY
  }
}

export function createGzip(options: ZlibOptions = {}) {
  options = { ...defaultGzipOptions, ...options }
  return (buf: InputType) => gzip(buf, options)
}

export function createBrotil(options: BrotliOptions = {}) {
  options = { ...defaultBrotliOptions, ...options }
  return (buf: InputType) => brotli(buf, options)
}

// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
export function slash(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  if (isExtendedLengthPath) { return path }
  return path.replace(/\\/g, '/')
}

export function stringToByte(b: string | Uint8Array) {
  if (typeof b === 'string') { return encoder.encode(b) }
  return b
}

export function byteToString(b: string | Uint8Array) {
  if (typeof b === 'string') { return b }
  return decoder.decode(b)
}

export async function readAll(entry: string) {
  const paths = await Promise.all((await fsp.readdir(entry)).map((dir) => path.join(entry, dir)))
  let pos = 0
  const result: string[] = []
  while (pos !== paths.length) {
    const dir = paths[pos]
    const stat = await fsp.stat(dir)
    if (stat.isDirectory()) {
      const dirs = await fsp.readdir(dir)
      paths.push(...dirs.map((sub) => path.join(dir, sub)))
    }
    if (stat.isFile()) {
      result.push(dir)
    }
    pos++
  }
  return result
}
// MIT License
// Copyright (c) Vite

export function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return fs.statSync(file, { throwIfNoEntry: false })
  } catch {
    // Ignore errors
  }
}

export function isFileReadable(filename: string): boolean {
  if (!tryStatSync(filename)) {
    return false
  }

  try {
    // Check if current process has read permission to the file
    fs.accessSync(filename, fs.constants.R_OK)

    return true
  } catch {
    return false
  }
}

export function createDebug(namespace: string) {
  const hasDebug = process.env.DEBUG || process.env.ANALYZE_DEBUG
  if (hasDebug) {
    return (...args: unknown[]) => {
      console.log(ansis.hex('#5B45DE')(`[${namespace}]`), ...args)
    }
  }
  return noop
}
// https://github.com/vitejs/vite/blob/main/packages/vite/bin/vite.js#L14-L33
export const analyzerDebug = createDebug('vite:bundle-analyzer')

export function arena() {
  let hasSet = false
  let binary: Uint8Array
  return {
    rs: new Readable(),
    into(b: string | Uint8Array) {
      if (hasSet) { return }
      this.rs.push(b)
      this.rs.push(null)
      if (!binary) {
        binary = stringToByte(b)
      }
      hasSet = true
    },
    refresh(data?: string | Uint8Array) {
      if (data) {
        binary = stringToByte(data)
      }
      hasSet = false
      this.rs = new Readable()
      this.into(binary)
    }
  }
}
