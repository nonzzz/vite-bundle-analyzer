import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '../client/application'
import type { Module, Sizes } from '../client/interface'

export interface ClientOptions {
  sizes: Sizes
  analyzeModule: Module[]
}

// eslint-disable-next-line react-prefer-function-component/react-prefer-function-component
export class AnalyzerClient {
  private container?: Element
  private flag: (() => void) | false
  private clientOptions: ClientOptions
  constructor() {
    this.flag = false
    this.clientOptions = {
      sizes: 'statSize',
      analyzeModule: []
    }
  }
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

  private syncModuleOptions() {
    const evt = new CustomEvent('update:options', { detail: this.clientOptions })
    window.dispatchEvent(evt)
  }

  setOptions(opts: ClientOptions) {
    this.container = undefined
    this.clientOptions = { ...this.clientOptions, ...opts }
    if (!this.flag) {
      this.flag = () => this.syncModuleOptions()
      window.addEventListener('client:ready', this.flag)
    } else {
      this.syncModuleOptions()
    }
  }

  destroy() {
    if (this.container) {
      ReactDOM.createRoot(this.container).unmount()
      if (this.flag) {
        window.removeEventListener('client:ready', this.flag)
        this.flag = false
      }
    }
  }
}
