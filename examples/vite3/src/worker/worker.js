import { recoverMessage } from './sub'

self.onmessage = function(event) {
  const { data } = event
  if (data.kind === 'test') {
    recoverMessage()
  }
}
