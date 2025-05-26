import { inline } from '@stylex-extend/core'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import { c2m, createTreemap as _createTreemap, sortChildrenByKey } from 'squarified'
import type { ExposedEventCallback } from 'squarified'
import {
  presetColorPlugin,
  presetDragElementPlugin,
  presetHighlightPlugin,
  presetScalePlugin,
  presetZoomablePlugin
} from 'squarified/plugin'
import { useQueryParams, useResize } from '../../composables'
import { useApplicationContext, useToggleSize } from '../../context'
import { createMagicEvent } from '../../special'
import type { QueryKind } from '../../special'
import { filterLayoutDataPlugin, menuPlugin } from './plugin'

function createTreemap() {
  return _createTreemap({
    plugins: [
      presetColorPlugin,
      presetHighlightPlugin,
      presetDragElementPlugin,
      presetZoomablePlugin,
      filterLayoutDataPlugin,
      presetScalePlugin(),
      menuPlugin()
    ]
  })
}

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export interface TreemapProps {
  onMousemove: ExposedEventCallback<'mousemove'>
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

  const resize = useCallback(() => instanceRef.current?.resize(), [])

  useResize(root, resize)

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
      if (!metadata.module) {
        return
      }
      const evt = createMagicEvent('graph:click', metadata.module)
      window.dispatchEvent(evt)
    })
  }, [])

  useEffect(() => {
    instanceRef.current?.on('mousemove', props.onMousemove)
  }, [props])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })} />
})
