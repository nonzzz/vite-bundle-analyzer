import fsp from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'
import { defaultWd, slash } from './shared'
import { Module } from './module'
import type { DefaultSizes } from './interface'

export interface RenderOptions {
    title: string
    mode: DefaultSizes
}

export async function renderView(module: Module, options: RenderOptions) {
  // 
  const clientAssetsPaths = fg.sync(slash(path.join(defaultWd, 'dist', 'client', 'assets', '*')))
  const clientAssets = await Promise.all(clientAssetsPaths.map(async (p) => {
    const fileType = path.extname(p).replace('.', '')
    const content = await fsp.readFile(p, 'utf8')
    return { fileType, content }
  }))

  const js = clientAssets.filter(v => v.fileType === 'js')
  const css = clientAssets.filter(v => v.fileType === 'css')

  const prettyModule = await module.pretty()

  return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${options.title}</title>
                <style>${css[0].content}</style>
                <script>${js[0].content}</script>
            </head>
            <body>
                <div id="app" />
                <script>
                    window.defaultSizes = '${options.mode}';
                    window.prettyModule = ${JSON.stringify(prettyModule)}
                </script>
            </body>
        </html>`
}
