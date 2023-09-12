import type{ Plugin } from 'vite'
import { name } from '../../package.json'

function analyzer(): Plugin {
  return {
    name,
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundles) {
      console.log(bundles)
    }
  }
}

export { analyzer }

export { analyzer as default }
