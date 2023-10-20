import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './application'

window.addEventListener('load', () => {
  const element = document.querySelector('#app')!
  ReactDOM.createRoot(element).render(<React.StrictMode><App /></React.StrictMode>)
})
