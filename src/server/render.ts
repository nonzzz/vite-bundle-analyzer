import fsp from 'fs/promises'
import path from 'path'
import url from 'url'
import fg from 'fast-glob'
import { slash } from './shared'
import type { DefaultSizes, Foam } from './interface'

export interface RenderOptions {
    title: string
    mode: DefaultSizes
}

const ___filename = url.fileURLToPath(import.meta.url)

const ___dirname = path.dirname(___filename)

export async function renderView(foamModule: Foam[], options: RenderOptions) {
  const clientAssetsPaths = fg.sync(slash(path.join(___dirname, 'client', 'assets', '*')))
  const clientAssets = await Promise.all(clientAssetsPaths.map(async (p) => {
    const fileType = path.extname(p).replace('.', '')
    const content = await fsp.readFile(p, 'utf8')
    return { fileType, content }
  }))

  const js = clientAssets.filter(v => v.fileType === 'js')
  const css = clientAssets.filter(v => v.fileType === 'css')

  return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${options.title}</title>
                ${css.map(({ content }) => `<style>${content}</style>`)}
                ${js.map(({ content }) => `<script>${content}</script>`)}
            </head>
            <body>
                <div id="app" />
                <script>
                    window.defaultSizes = '${options.mode}';
                    window.foamModule = ${JSON.stringify(foamModule)}
                </script>
            </body>
        </html>`
}
