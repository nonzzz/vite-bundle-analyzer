import { Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { createTreemap, presetDecorator } from 'squarified'

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export interface TreemapProps {
}

// eslint-disable-next-line no-unused-vars
export const Treemap = forwardRef(<_, P>(props: TreemapProps, ref: Ref<TreemapComponentInstance>) => {
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

  useImperativeHandle(ref, () => instanceRef.current!)

  const callbackRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      // element is mounted
      instanceRef.current = createTreemap()
      instanceRef.current.use('decorator', presetDecorator)
      instanceRef.current.init(el)
    } else {
      // element is unmounted
      instanceRef.current?.dispose()
      instanceRef.current = undefined
    }
    root.current = el
  }, [])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })}></div>
})
