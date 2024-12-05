import { Main, SideBar } from './client.jsx'

declare global {
  interface Window {
    CUSTOM_SIDE_BAR: boolean
  }
}

function render() {
  window.CUSTOM_SIDE_BAR = true
  window.addEventListener('client:ready', () => {
    setTimeout(() => {
      const evt = new CustomEvent('send:ui', { detail: { Component: SideBar, type: 'SideBar' } })
      window.dispatchEvent(evt)
      const evt2 = new CustomEvent('send:ui', { detail: { Component: Main, type: 'Main' } })
      window.dispatchEvent(evt2)
    }, 300)
  })
}

// https:// github.com/evanw/esbuild/issues/1031
export const CLIENT_CUSTOM_RENDER_SCRIPT = `
  ${SideBar.toString()}
  ${Main.toString()}
  ${render.toString()}
  render()
`
