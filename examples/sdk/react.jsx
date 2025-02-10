import React, { useEffect } from 'react'
import DOM from 'react-dom'
import ReactDOM from 'react-dom/client'
import { AnalyzerClient } from 'vite-bundle-analyzer/sdk/browser'
import 'vite-bundle-analyzer/sdk/browser.css'
import data from '../../src/client/data.json' with { type: 'json' }

const element = document.querySelector('#app')

export function App() {
  const client = new AnalyzerClient()
  useEffect(() => {
    client.render('#app')
    client.setOptions({
      sizes: 'statSize',
      analyzeModule: data
    })
  }, [])

  return <div />
}

ReactDOM.createRoot(element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
