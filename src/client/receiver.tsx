import { useEffect } from 'react'
import { useToggleSize, useUpdateAnalyzeModule, useUpdateUI } from './context'
import type { SendFilterMessage, SendUIMessage, UpdateOptionsMessage } from './special'
import { createMagicEvent } from './special'

export function Receiver() {
  const updateUI = useUpdateUI()
  const updateAnalyzeModule = useUpdateAnalyzeModule()
  const toggleSize = useToggleSize()
  useEffect(() => {
    const handler = (evt: CustomEvent<SendUIMessage>) => {
      if (evt.detail.Component) {
        updateUI(evt.detail.type, evt.detail.Component)
      }
    }

    const filterHandler = (evt: CustomEvent<SendFilterMessage>) => {
      if (evt.detail.analyzeModule) {
        updateAnalyzeModule(evt.detail.analyzeModule)
      }
    }

    const updateOptionsHandler = (evt: CustomEvent<UpdateOptionsMessage>) => {
      if (evt.detail.sizes) {
        toggleSize(evt.detail.sizes)
      }
      if (evt.detail.analyzeModule) {
        updateAnalyzeModule(evt.detail.analyzeModule)
      }
    }

    // @ts-expect-error custom-event
    window.addEventListener('send:ui', handler)
    // @ts-expect-error custom-event
    window.addEventListener('send:filter', filterHandler)
    // @ts-expect-error custom-event
    window.addEventListener('update:options', updateOptionsHandler)

    const evt = createMagicEvent('client:ready', {})
    window.dispatchEvent(evt)
    return () => {
      // @ts-expect-error custom-event
      window.removeEventListener('send:ui', handler)
      // @ts-expect-error custom-event
      window.removeEventListener('send:filter', filterHandler)
      // @ts-expect-error custom-event
      window.removeEventListener('update:options', updateOptionsHandler)
    }
  }, [updateUI, updateAnalyzeModule, toggleSize])

  return <div />
}
