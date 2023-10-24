import http from 'http'
import fs from 'fs'
import type { AddressInfo } from 'net'
import path from 'path'
import sirv from 'sirv'
import { clientPath } from './shared'
import type { Foam } from './interface'
import type { RenderOptions } from './render'

const assets = sirv(clientPath, { dotfiles: true })

export function createServer(port = 0) {
  const server = http.createServer()
  server.on('request', (req, res) => {
    assets(req, res, () => {
      res.statusCode = 404
      res.end('File not found')
    })
  })

  server.listen(port, () => {
    console.log(`server run on http://localhost:${(server.address() as AddressInfo).port}`)
  })

  const setup = (foamModule: Foam[], options: RenderOptions) => {
    server.on('listening', () => {
      const previousListerner = server.listeners('request')
      server.removeAllListeners('request')
      server.on('request', (req, res) => {
        if (req.url === '/') {
          res.setHeader('Content-Type', 'text/html; charset=utf8;')
          let html = fs.readFileSync(path.join(clientPath, 'index.html'), 'utf8')
          html = html.replace(/<\/div>/, `</div>\r\n<script>window.defaultSizes = '${options.mode}';\r\nwindow.foamModule = ${JSON.stringify(foamModule)};</script>`)
          res.end(html)
        } else {
          previousListerner.forEach(listen => listen.call(server, req, res))
        }
      })
    })
  }

  return { setup }
}
