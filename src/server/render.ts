import fsp from 'fs/promises'
import path from 'path'
import { clientAssetsPath, clientPath, injectHTMLTag, readAll } from './shared'
import type { DefaultSizes, Foam } from './interface'

export interface RenderOptions {
  title: string
  mode: DefaultSizes
}

export async function renderView(foamModule: Foam[], options: RenderOptions) {
  const clientAssetsPaths = await readAll(clientAssetsPath)
  const clientAssets = await Promise.all(clientAssetsPaths.map(async (p) => {
    const fileType = path.extname(p).replace('.', '')
    const content = await fsp.readFile(p, 'utf8')
    return { fileType, content }
  }))

  const assets = clientAssets.filter(a => ['js', 'css'].includes(a.fileType))
  let html = await fsp.readFile(path.join(clientPath, 'index.html'), 'utf8')
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
  html = html.replace(/<title>(.*?)<\/title>/, `<title>${options.title}</title>`)
  html = injectHTMLTag({ 
    html,
    injectTo: 'head',
    descriptors: assets.map(({ fileType, content }) => {
      if (fileType === 'js') return `<script>${content}</script>`
      return `<style>${content}</style>`
    }) })
  html = injectHTMLTag({ 
    html,
    injectTo: 'body',
    descriptors: [`<script>
    window.defaultSizes = ${JSON.stringify(options.mode)};\n
    window.foamModule = ${JSON.stringify(foamModule)};\n
    </script>`] })
  return html
}
