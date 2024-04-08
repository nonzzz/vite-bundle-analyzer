import { useEffect } from 'react'

export function useClickAnyWhere(
  handler: (event: Event) => void
) {
  useEffect(() => {
    const callback = (event: Event) => handler(event)
    
    document.addEventListener('click', callback)
    return () => document.removeEventListener('click', callback)
  }, [handler])
}
