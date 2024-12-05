import React from 'react'
import ReactDOM from 'react-dom/client'

export function App() {
  return <div>111</div>
}

ReactDOM.createRoot(document.querySelector('#app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
