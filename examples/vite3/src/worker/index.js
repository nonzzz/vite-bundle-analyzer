import MyWorker from './worker?worker'

const worker = new MyWorker()

export function send() {
  worker.postMessage({ kind: 'test', message: 'ping' })
}
