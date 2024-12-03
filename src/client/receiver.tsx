import { useEffect } from 'react'
import type { SendUIMessage } from './special'
import { createMagicEvent } from './special'
import { useUpdateUI } from './context'

export function Receiver() {
  const updateUI = useUpdateUI()
  useEffect(() => {
    const evt = createMagicEvent('client:ready', null)
    window.dispatchEvent(evt)
    const handler = (evt: CustomEvent<SendUIMessage>) => {
      if (evt.detail.Component) {
        updateUI(evt.detail.type, evt.detail.Component)
      }
    }
    // @ts-expect-error
    window.addEventListener('send:ui', handler)
    // @ts-expect-error
    return () => window.removeEventListener('send:ui', handler)
  }, [updateUI])

  return <div />
}
