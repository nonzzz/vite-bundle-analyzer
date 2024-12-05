import React from 'react'
import DOM from 'react-dom'
import ReactDOM from 'react-dom/client'
import { App } from './application'

// For custom integration.
window.React = React
window.ReactDOM = DOM

const element = document.querySelector('#app')!
ReactDOM.createRoot(element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
