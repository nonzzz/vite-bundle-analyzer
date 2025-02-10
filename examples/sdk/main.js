import { AnalyzerClient } from 'vite-bundle-analyzer/sdk/browser'
import 'vite-bundle-analyzer/sdk/browser.css'
import data from '../../src/client/data.json' with { type: 'json' }

const client = new AnalyzerClient()

client.render('#app')

client.setOptions({
  sizes: 'statSize',
  analyzeModule: data
})
