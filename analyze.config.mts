import { defineConfig, mergeConfig } from 'vite'
import conf from './src/client/vite.config.mts'
import { analyzer } from './src/server'

const c = conf({ command: 'build', mode: 'production' })
export default mergeConfig(
  c,
  defineConfig({
    plugins: [...c.plugins!, analyzer({ analyzerMode: 'json' })]
  })
)
