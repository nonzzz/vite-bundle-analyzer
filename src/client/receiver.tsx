import { useEffect } from 'react'
import type { SendFilterMessage, SendUIMessage } from './special'
import { createMagicEvent } from './special'
import { useUpdateAnalyzeModule, useUpdateUI } from './context'

export function Receiver() {
  const updateUI = useUpdateUI()
  const updateAnalyzeModule = useUpdateAnalyzeModule()
  useEffect(() => {
    const evt = createMagicEvent('client:ready', null)
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

    // @ts-expect-error
    window.addEventListener('send:ui', handler)
    // @ts-expect-error
    window.addEventListener('send:filter', filterHandler)
    return () => {
      // @ts-expect-error
      window.removeEventListener('send:ui', handler)
      // @ts-expect-error
      window.removeEventListener('send:filter', filterHandler)
    }
  }, [updateUI, updateAnalyzeModule])

  return <div />
}
