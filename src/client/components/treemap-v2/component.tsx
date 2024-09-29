import { Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { PaintOptions, createTreemap } from './treemap'
import type { DuckModule } from './interface'

export interface TreemapProps<T> {
  options?: PaintOptions<T>
}

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

// eslint-disable-next-line no-unused-vars
export const Treemap = forwardRef(<_, P>(props: TreemapProps<DuckModule<P>>, ref: Ref<TreemapComponentInstance>) => {
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
      instanceRef.current = createTreemap().init(el)
    } else {
      // element is unmounted
      instanceRef.current?.dispose()
      instanceRef.current = undefined
    }
    root.current = el
  }, [])

  useEffect(() => {
    instanceRef.current?.setOptions(props?.options)
  }, [props.options])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })}></div>
})
