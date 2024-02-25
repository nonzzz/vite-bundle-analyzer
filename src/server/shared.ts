import zlib from 'zlib'
import utils from 'util'
import fs from 'fs'
import path from 'path'
import type { InputType, ZlibOptions } from 'zlib'

export * from '../shared'

const gzip = utils.promisify(zlib.gzip)

const defaultGzipOptions = <ZlibOptions>{
  level: zlib.constants.Z_DEFAULT_LEVEL
}

export const clientPath = slash(path.join(__dirname, 'client'))

export const clientAssetsPath = path.join(clientPath, 'assets')

export function createGzip(options: ZlibOptions = {}) {
  options = Object.assign(defaultGzipOptions, options)
  return (buf: InputType) => {
    return gzip(buf, options)
  }
}

// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
export function slash(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  if (isExtendedLengthPath) return path
  return path.replace(/\\/g, '/')
}

interface InjectHTMLTagOptions {
  html: string
  injectTo: 'body' | 'head',
  descriptors: string[]
}

export function injectHTMLTag(options: InjectHTMLTagOptions) {
  const regExp = options.injectTo === 'head' ? /([ \t]*)<\/head>/i : /([ \t]*)<\/body>/i
  return options.html.replace(regExp, (match) => `${options.descriptors.join('\n')}${match}`)
}

export function stringToByte(b: string | Uint8Array) {
  if (typeof b === 'string') return new TextEncoder().encode(b)
  return b
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
