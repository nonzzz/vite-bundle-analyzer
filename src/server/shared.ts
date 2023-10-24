import zlib from 'zlib'
import utils from 'util'
import path from 'path'
import url from 'url'
import type { ZlibOptions } from 'zlib'

const gzip = utils.promisify(zlib.gzip)

const defaultGzipOptions = <ZlibOptions>{
  level: zlib.constants.Z_DEFAULT_LEVEL
}

const ___filename = url.fileURLToPath(import.meta.url)

const ___dirname = path.dirname(___filename)

export const clientPath = slash(path.join(___dirname, 'client'))

export const clientAssetsPath = path.join(clientPath, 'assets')

export function noop() { /** noop**/ }

export function createGzip(options: ZlibOptions = {}) {
  options = Object.assign(defaultGzipOptions, options)
  return (buf: Buffer) => {
    return gzip(buf, options)
  }
}

export function pick<T extends object, A extends keyof T>(data: T, attrs: A[]) {
  return attrs.reduce((acc, cur) => ((acc[cur] = data[cur]), acc), {} as Pick<T, A>)
}

// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
export function slash(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path) 
  if (isExtendedLengthPath) return path
  return path.replace(/\\/g, '/') 
}
