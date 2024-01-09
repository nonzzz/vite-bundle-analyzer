import zlib from 'zlib'
import utils from 'util'
import path from 'path'
import type { ZlibOptions } from 'zlib'

export * from '../shared'

const gzip = utils.promisify(zlib.gzip)

const defaultGzipOptions = <ZlibOptions>{
  level: zlib.constants.Z_DEFAULT_LEVEL
}

export const clientPath = slash(path.join(__dirname, 'client'))

export const clientAssetsPath = path.join(clientPath, 'assets')

export function createGzip(options: ZlibOptions = {}) {
  options = Object.assign(defaultGzipOptions, options)
  return (buf: Buffer) => {
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
