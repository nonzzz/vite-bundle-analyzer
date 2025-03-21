// This script is work for build-server
// Pre generate common chunk for output

import fsp from 'fs/promises'
import path from 'path'
import { injectHTMLTag } from './src/server/render'
import type { Descriptor } from './src/server/render'
import { readAll } from './src/server/shared'

const defaultWd = process.cwd()

const clientPath = path.join(defaultWd, 'dist', 'client')
const clientAssetsPath = path.join(clientPath, 'assets')

async function main() {
  const clientAssetsPaths = await readAll(clientAssetsPath)
  const clientAssets = await Promise.all(clientAssetsPaths.map(async (p) => {
    const fileType = path.extname(p).replace('.', '')
    const content = await fsp.readFile(p, 'utf8')
    return { fileType, content }
  }))
  const assets = clientAssets.filter((a) => ['js', 'css'].includes(a.fileType))
  let html = await fsp.readFile(path.join(clientPath, 'index.html'), 'utf8')
  html = injectHTMLTag({
    html,
    injectTo: 'head',
    descriptors: [
      { text: '<--title-->', kind: 'title' },
      ...assets.map(({ fileType, content }) => ({
        kind: fileType === 'js' ? 'script' : 'style',
        text: content,
        attrs: fileType === 'js' ? ['type="module"'] : []
      })) satisfies Descriptor[]
    ]
  })
  html = injectHTMLTag({
    html,
    injectTo: 'body',
    descriptors: {
      kind: 'script',
      text: '<--module-->'
    } satisfies Descriptor | Descriptor[]
  })

  const codeBlocks = [
    'export function html (title, module)',
    '{',
    decode.toString(),
    `const b64 = "${encode(html)}";`,
    `return decode(b64).replace('<--title-->', title).replace('<--module-->', module);`,
    '}'
  ]

  process.stdout.write(codeBlocks.join('\n'))
}

main().catch((e) => console.error(e))

// lzw

function encode(str: string): string {
  const dictionary = new Map<string, number>()
  const result: number[] = []

  let dictSize = 128
  for (let i = 0; i < 128; i++) {
    dictionary.set(String.fromCharCode(i), i)
  }

  let phrase = ''
  for (const char of str) {
    const combinedPhrase = phrase + char
    if (dictionary.has(combinedPhrase)) {
      phrase = combinedPhrase
    } else {
      result.push(dictionary.get(phrase)!)
      if (dictSize < 32768) {
        dictionary.set(combinedPhrase, dictSize++)
      }
      phrase = char
    }
  }

  if (phrase !== '') {
    result.push(dictionary.get(phrase)!)
  }

  const bytes = new Uint8Array(result.length * 2)
  for (let i = 0; i < result.length; i++) {
    bytes[i * 2] = result[i] >> 8
    bytes[i * 2 + 1] = result[i] & 0xFF
  }

  return Buffer.from(bytes).toString('base64').replace(/\s+/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function decode(base64Str: string): string {
  const normalizedStr = base64Str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = normalizedStr.length % 4
  const paddedStr = padding
    ? normalizedStr + '='.repeat(4 - padding)
    : normalizedStr

  const buffer = Buffer.from(paddedStr, 'base64')
  const bytes = new Uint8Array(buffer)

  if (bytes.length % 2 !== 0) {
    throw new Error('Invalid base64 input: length must be even')
  }

  const compressed = new Array<number>(bytes.length / 2)

  for (let i = 0; i < compressed.length; i++) {
    const highByte = bytes[i * 2]
    const lowByte = bytes[i * 2 + 1]
    if (highByte === undefined || lowByte === undefined) {
      throw new Error(`Invalid byte access at index ${i}`)
    }
    compressed[i] = (highByte << 8) | lowByte
  }

  const dictionary = new Map<number, string>()
  let dictSize = 128

  for (let i = 0; i < 128; i++) {
    dictionary.set(i, String.fromCharCode(i))
  }

  if (compressed.length === 0) { return '' }

  const firstCode = compressed[0]
  if (firstCode >= 128) {
    throw new Error('Invalid initial code')
  }

  const result: string[] = []
  let phrase = String.fromCharCode(firstCode)
  result.push(phrase)

  for (let i = 1; i < compressed.length; i++) {
    const code = compressed[i]

    if (code > dictSize) {
      throw new Error(`Invalid code ${code} at position ${i}`)
    }

    let entry: string
    if (dictionary.has(code)) {
      entry = dictionary.get(code)!
    } else if (code === dictSize) {
      entry = phrase + phrase[0]
    } else {
      throw new Error(`Invalid compressed code: ${code} at position ${i}`)
    }

    result.push(entry)

    if (dictSize < 32768) {
      dictionary.set(dictSize++, phrase + entry[0])
    }
    phrase = entry
  }

  return result.join('')
}
