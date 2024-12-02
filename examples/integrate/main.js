import http from 'http'
import { SSE, injectHTMLTag, renderView } from 'vite-bundle-analyzer'
import data from '../../src/client/data.json' with { type: 'json' }

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

const app = http.createServer()

app.on('request', async (req, res) => {
  if (req.url === '/') {
    let html = await renderView(data, { title: 'Vite Bundle Analyzer', mode: 'parsed' })
    html = injectHTMLTag({
      html,
      injectTo: 'body',
      descriptors: [
        { kind: 'script', text: GRAPH_CLICK_SCRIPT },
        { kind: 'script', text: CLIENT_EVENT_STREAM }
      ]
    })
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
    res.write(html)
    res.end()
  } else if (req.url === '/nonzzz' && req.headers.accept === 'text/event-stream') {
    sse.serverEventStream(req, res)
  }
})

app.listen(3000, () => {
  console.log('Server started at http://localhost:3000')
})

setInterval(() => {
  sse.sendEvent('change', new Date().toLocaleTimeString())
}, 3000)
