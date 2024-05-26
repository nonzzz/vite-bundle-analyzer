import { defineConfig, mergeConfig } from 'vite'
import { analyzer } from './src/server'
import conf from './src/client/vite.config'

const c = conf({ command: 'build', mode: 'production' })
export default mergeConfig(
  c,
  defineConfig({
    plugins: [...c.plugins!, analyzer({ analyzerMode: 'json' })]
  })
)
