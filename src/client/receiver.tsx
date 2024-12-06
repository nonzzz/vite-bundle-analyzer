import { useEffect } from 'react'
import { useUpdateAnalyzeModule, useUpdateUI } from './context'
import type { SendFilterMessage, SendUIMessage } from './special'
import { createMagicEvent } from './special'

export function Receiver() {
  const updateUI = useUpdateUI()
  const updateAnalyzeModule = useUpdateAnalyzeModule()
  useEffect(() => {
    const evt = createMagicEvent('client:ready', {})
    window.dispatchEvent(evt)
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

    // @ts-expect-error custom-event
    window.addEventListener('send:ui', handler)
    // @ts-expect-error custom-event
    window.addEventListener('send:filter', filterHandler)
    return () => {
      // @ts-expect-error custom-event
      window.removeEventListener('send:ui', handler)
      // @ts-expect-error custom-event
      window.removeEventListener('send:filter', filterHandler)
    }
  }, [updateUI, updateAnalyzeModule])

  return <div />
}
