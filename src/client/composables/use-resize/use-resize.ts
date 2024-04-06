import { useEffect } from 'react'

export function useResize(fn: () => void) {
  useEffect(() => {
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
}
