import http from 'http'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { generateInjectCode, injectHTMLTag } from './render'
import { clientPath } from './shared'
import type { Module } from './interface'
import type { RenderOptions } from './render'

const mimeTypes: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css'
}

function createStaticMiddleware(options: RenderOptions, analyzeModule: Module[]) {
  const cache: Map<string, { data: Buffer | string; mimeType: string }> = new Map()

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
        descriptors: {
          kind: 'script',
          text: generateInjectCode(analyzeModule, options.mode)
        }
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

async function ensureEmptyPort(preferredPort: number) {
  const getPort = () => Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024

  const checkPort = async (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer()
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false)
        } else {
          resolve(true)
        }
      })
      server.once('listening', () => {
        server.close(() => {
          resolve(true)
        })
      })
      server.listen(port, 'localhost')
    })
  }
  if (preferredPort === 0) {
    let portAvailable = false
    let randomPort = 0
    while (!portAvailable) {
      randomPort = getPort()
      portAvailable = await checkPort(randomPort)
    }
    return randomPort
  }
  let portAvailable = await checkPort(preferredPort)
  if (portAvailable) {
    return preferredPort
  } else {
    let nextPort = preferredPort + 1
    while (true) {
      portAvailable = await checkPort(nextPort)
      if (portAvailable) {
        return nextPort
      }
      nextPort++
    }
  }
}

export async function createServer(port = 0) {
  const server = http.createServer()
  const safePort = await ensureEmptyPort(port)

  server.listen(safePort, () => {
    console.log(`server run on http://localhost:${safePort}`)
  })

  const setup = (analyzeModule: Module[], options: RenderOptions) => {
    server.on('request', createStaticMiddleware(options, analyzeModule))
  }

  return {
    setup,
    get port() {
      return safePort
    }
  }
}
