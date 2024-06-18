import path from 'path'
import { clientAssetsPath, clientPath, fsp, readAll } from './shared'
import type { DefaultSizes, Module } from './interface'

export interface RenderOptions {
  title: string
  mode: DefaultSizes
}

interface Descriptor {
  kind: 'script' | 'style'
  text: string
  attrs?: string[]
}
interface InjectHTMLTagOptions {
  html: string
  injectTo: 'body' | 'head'
  descriptors: Descriptor | Descriptor[]
}

// Refactor this function
export function injectHTMLTag(options: InjectHTMLTagOptions) {
  const regExp = options.injectTo === 'head' ? /([ \t]*)<\/head>/i : /([ \t]*)<\/body>/i
  options.descriptors = Array.isArray(options.descriptors) ? options.descriptors : [options.descriptors]
  const descriptors = options.descriptors.map(d => {
    if (d.attrs && d.attrs.length > 0) {
      return `<${d.kind} ${d.attrs.join(' ')}>${d.text}</${d.kind}>`
    }
    return `<${d.kind}>${d.text}</${d.kind}>`
  })
  return options.html.replace(regExp, (match) => `${descriptors.join('\n')}${match}`)
}

// https://tc39.es/ecma262/#sec-putvalue
// Using var instead of set attr to window we can reduce 9 bytes
export function generateInjectCode(analyzeModule: Module[], mode: string) {
  const { stringify } = JSON
  return `var defaultSizes=${stringify(mode)},analyzeModule=${stringify(analyzeModule)};`
}

export async function renderView(analyzeModule: Module[], options: RenderOptions) {
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
    descriptors: assets.map(({ fileType, content }) => ({
      kind: fileType === 'js' ? 'script' : 'style',
      text: content,
      attrs: fileType === 'js' ? ['type="module"'] : []
    }))
  })
  html = injectHTMLTag({
    html,
    injectTo: 'body',
    descriptors: {
      kind: 'script',
      text: generateInjectCode(analyzeModule, options.mode)
    }
  })
  return html
}
