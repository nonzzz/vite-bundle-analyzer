import http from 'http'
import fs from 'fs'
import type { AddressInfo } from 'net'
import path from 'path'
import { clientPath, injectHTMLTag } from './shared'
import type { Foam } from './interface'
import type { RenderOptions } from './render'

const mimeTypes: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css'
}

function createStaticMiddleware(options: RenderOptions, foamModule: Foam[]) {
  const cache: Map<string, { data: Buffer | string, mimeType: string }> = new Map()
  
  return function staticMiddleware(req: http.IncomingMessage, res: http.ServerResponse) {
    const filePath = path.join(clientPath, req.url!)
    if (cache.has(filePath)) {
      const { data, mimeType } = cache.get(filePath)!
      res.writeHead(200, { 'Content-Type': mimeType })
      res.end(data)
      return
    }
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf8;')
      let html = fs.readFileSync(path.join(clientPath, 'index.html'), 'utf8')
      html = html.replace(/<title>(.*?)<\/title>/, `<title>${options.title}</title>`)
      html = injectHTMLTag({
        html,
        injectTo: 'body',
        descriptors: [`<script>
          window.defaultSizes = ${JSON.stringify(options.mode)};\n
          window.foamModule = ${JSON.stringify(foamModule)};\n
          </script>`]
      })
      res.end(html)
      cache.set(filePath, { data: html, mimeType: 'text/html; charset=utf8;' })
      return
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404
        res.end('Not Found')
      } else {
        const ext = path.extname(filePath)
        const mimeType = mimeTypes[ext] || 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': mimeType })
        res.end(data)
        cache.set(filePath, { data, mimeType })
      }
    })
  }
}

export function createServer(port = 0) {
  const server = http.createServer()
 
  server.listen(port, () => {
    console.log(`server run on http://localhost:${(server.address() as AddressInfo).port}`)
  })

  const setup = (foamModule: Foam[], options: RenderOptions) => {
    server.on('request', createStaticMiddleware(options, foamModule))
  }

  return {
    setup,
    get port() {
      return (server.address() as AddressInfo).port
    }
  }
}
