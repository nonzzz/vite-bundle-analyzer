import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { createTreemap } from './treemap'

export interface TreemapProps {
}

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export const Treemap = forwardRef((props: TreemapProps, ref) => {
  const root = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<TreemapComponentInstance>()

  useEffect(() => {
    const el = root.current
    if (el) {
      const observer = new ResizeObserver(() => {
        instanceRef.current?.resize()
      })
      observer.observe(el)
      return () => {
        observer.unobserve(el)
        observer.disconnect()
      }
    }
    return noop
  }, [])

  useImperativeHandle(ref, () => ({}))

  const callbackRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      // element is mounted
      instanceRef.current = createTreemap().init(el)
    } else {
      // element is unmounted
      instanceRef.current?.dispose()
      instanceRef.current = undefined
    }
    root.current = el
  }, [])

  useEffect(() => {}, [])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })}></div>
})
