import { useEffect } from 'react'

export function useResize(ref: React.RefObject<HTMLElement>, fn: () => void) {
  useEffect(() => {
    if (!ref.current) { return }

    const observer = new ResizeObserver(() => {
      fn()
    })

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [ref, fn])
}
