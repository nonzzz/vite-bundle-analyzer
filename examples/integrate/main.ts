import { SSE, createServer, injectHTMLTag, renderView } from 'vite-bundle-analyzer'
import type { C, Module } from 'vite-bundle-analyzer'
import data from '../../src/client/data.json' with { type: 'json' }
import { CLIENT_CUSTOM_RENDER_SCRIPT } from './ui'

const sse = new SSE()

const GRAPH_CLICK_SCRIPT = `
window.addEventListener('graph:click', (e) => {
  console.log(e.detail)
})
`

function initClientEventStream() {
  new EventSource('/nonzzz').addEventListener('change', (e) => {
    console.log(e.data)
  })
}

const CLIENT_EVENT_STREAM = `
  ${initClientEventStream.toString()}
  initClientEventStream()
`

const server = createServer()

function asyncMiddleware(fn: (c: C, next: () => void) => Promise<void>) {
  return (c: C, next: () => void) => {
    Promise.resolve(fn(c, next)).catch(next)
  }
}

server.get(
  '/',
  asyncMiddleware(async (c) => {
    let html = await renderView(data as Module[], { title: 'Vite Bundle Analyzer', mode: 'parsed' })
    html = injectHTMLTag({
      html,
      injectTo: 'body',
      descriptors: [
        { kind: 'script', text: GRAPH_CLICK_SCRIPT },
        { kind: 'script', text: CLIENT_EVENT_STREAM },
        { kind: 'script', text: CLIENT_CUSTOM_RENDER_SCRIPT }
      ]
    })
    c.res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
    c.res.write(html)
    c.res.end()
  })
)

server.get('/nonzzz', (c, next) => {
  if (c.req.headers.accept === 'text/event-stream') {
    sse.serverEventStream(c.req, c.res)
  }
  next()
})

server.listen(3000, () => {
  console.log('Server started at http://localhost:3000')
})

setInterval(() => {
  sse.sendEvent('change', new Date().toLocaleTimeString())
}, 3000)
