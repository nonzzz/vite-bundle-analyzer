import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './application'

const element = document.querySelector('#app')!
ReactDOM.createRoot(element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
