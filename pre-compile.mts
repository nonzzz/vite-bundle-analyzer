// This script is work for build-server
// Pre generate common chunk for output

import path from 'path'
import fsp from 'fs/promises'

import { readAll } from './src/server/shared'
import { injectHTMLTag } from './src/server/render'
import type { Descriptor } from './src/server/render'

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
  const assets = clientAssets.filter(a => ['js', 'css'].includes(a.fileType))
  let html = await fsp.readFile(path.join(clientPath, 'index.html'), 'utf8')
  html = injectHTMLTag({
    html,
    injectTo: 'head',
    descriptors: [
      ...assets.map(({ fileType, content }) => ({
        kind: fileType === 'js' ? 'script' : 'style',
        text: content,
        attrs: fileType === 'js' ? ['type="module"'] : []
      })) satisfies Descriptor[]
    ]
  })
  process.stdout.write(`export const html =  ${JSON.stringify(html)}`)
}

main()
