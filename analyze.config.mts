import conf from './src/client/vite.config.mts'
import { analyzer } from './src/server'

// Use mergeConfig seems bug.

const c = conf({ command: 'build', mode: 'production' })

c.plugins?.push(analyzer({
  analyzerMode: 'json'
}))

export default c
