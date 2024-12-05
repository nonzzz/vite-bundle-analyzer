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

  process.stdout.write(`export function html (title, module) {
    return ${JSON.stringify(html)}.replace('<--title-->', title).replace('<--module-->', module)
    }`)
}

main().catch((e) => console.error(e))
