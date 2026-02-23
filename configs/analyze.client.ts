import { analyzer } from '../dist'
import conf from '../src/client/vite.config.mts'

// Use mergeConfig seems bug.

const c = conf({ command: 'build', mode: 'production' })

c.plugins?.push(
  analyzer({
    analyzerMode: 'json'
  })
)

export default c
