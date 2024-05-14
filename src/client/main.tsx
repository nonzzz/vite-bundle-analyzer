import React from 'react'
import ReactDOM from 'react-dom/client'
import { injectGlobalStyle } from '@stylex-extend/core'
import { App } from './application'

injectGlobalStyle({
  '#app,html,body': {
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    height: '100%',
    width: '100%'
  },
  p: {
    margin: 0
  },
  'button,input,select,textarea': {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    margin: 0,
    '&:focus': {
      outline: 'none'
    }
  }
})

window.addEventListener('load', () => {
  const element = document.querySelector('#app')!
  ReactDOM.createRoot(element).render(<React.StrictMode><App /></React.StrictMode>)
})
