import { Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { c2m, createTreemap, presetDecorator, sortChildrenByKey } from 'squarified'
import type { PrimitiveEventCallback } from 'squarified'
import { useApplicationContext, useToggleSize } from '../../context'
import { createMagicEvent } from '../../special'
import type { QueryKind } from '../../special'
import { useQueryParams } from '../../composables'

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export interface TreemapProps {
  onMousemove: PrimitiveEventCallback<'mousemove'>
}

export const Treemap = forwardRef((props: TreemapProps, ref: Ref<TreemapComponentInstance>) => {
  const root = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<TreemapComponentInstance>()
  const { analyzeModule, sizes, scence } = useApplicationContext()

  const queryParams = useQueryParams()
  const toggleSize = useToggleSize()

  const visibleChunks = useMemo(() => {
    const filtered = analyzeModule.filter((m) => scence.has(m.label))
    const sortedData = sortChildrenByKey(
      filtered.map(
        (item) => c2m({ ...item, groups: sizes === 'statSize' ? item.stats : item.source }, sizes, (d) => ({ ...d, id: d.label }))
      ),
      'weight'
    )
    return sortedData
  }, [analyzeModule, scence, sizes])

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

  useEffect(() => {
    const size = queryParams.get('size') as QueryKind
    if (size) {
      toggleSize(size === 'gzip' ? 'gzipSize' : size === 'stat' ? 'statSize' : 'parsedSize')
    }
  }, [queryParams, toggleSize])

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

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setOptions({ data: visibleChunks })
    }
  }, [visibleChunks])

  useEffect(() => {
    instanceRef.current?.on('click', function(metadata) {
      this.zoom(metadata.module)
      const evt = createMagicEvent('graph:click', metadata.module)
      window.dispatchEvent(evt)
    })
  }, [])

  useEffect(() => {
    instanceRef.current?.on('mousemove', props.onMousemove)
  }, [props])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })} />
})
