import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './application'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const element = document.querySelector('#app')!

ReactDOM.createRoot(element).render(<React.StrictMode><App/></React.StrictMode>)
