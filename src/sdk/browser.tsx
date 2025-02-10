import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '../client/application'

// eslint-disable-next-line react-prefer-function-component/react-prefer-function-component
export class AnalyzerClient {
  private container?: Element
  render(el?: string | Element) {
    let container: Element | null
    if (el) {
      if (typeof el === 'string') {
        container = document.querySelector(el)
      } else {
        container = el
      }
    } else {
      container = document.querySelector('analyzer-client')
    }
    if (!container) {
      throw new Error('No container found')
    }
    this.container = container
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }

  destroy() {
    if (this.container) {
      ReactDOM.createRoot(this.container).unmount()
    }
  }
}
