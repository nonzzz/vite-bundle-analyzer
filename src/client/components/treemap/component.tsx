import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { ForwardedRef } from 'react'
import { noop } from 'foxact/noop'
import { useApplicationContext } from '../../context'
import type { Sizes } from '../../interface'
import { PaintEvent, createTreemap } from './treemap'
import type { Module } from './interface'
import { flattenModules, sortChildrenBySize } from './shared'

function handleModule(data: Module, size: Sizes) {
  if (Array.isArray(data.groups)) {
    data.groups = data.groups.map((m) => handleModule(m, size)).sort(sortChildrenBySize)
  }
  return { ...data, size: data[size] }
}

interface TreemapProps {
  onMousemove?: (event: PaintEvent<MouseEvent>) => void
}

export type TreemapInstance = ReturnType<typeof createTreemap>

export const Treemap = forwardRef((props: TreemapProps, ref: ForwardedRef<TreemapInstance>) => {
  const { onMousemove = noop } = props
  const treemapInstance = useRef<TreemapInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { analyzeModule, sizes, scence } = useApplicationContext()

  useImperativeHandle(ref, () => treemapInstance.current!)

  const handleMousemove = useCallback((event: PaintEvent<MouseEvent>) => {
    onMousemove(event)
  }, [onMousemove])

  const visibleChunks = useMemo(() => {
    return analyzeModule.filter(m => scence.has(m.label))
      .map(m => {
        m.groups = sizes === 'statSize' ? m.stats : m.source
        return handleModule(m as Module, sizes)
      })
  }, [analyzeModule, sizes, scence])

  const resize = () => {
    if (!treemapInstance.current) return
    treemapInstance.current.resize()
  }

  useEffect(() => {
    if (!visibleChunks.length) return
    if (!treemapInstance.current && containerRef.current) {
      const treemap = createTreemap(visibleChunks)
      treemapInstance.current = treemap
      treemapInstance.current.mount(containerRef.current!)
      treemapInstance.current.setup({
        onMousemove: handleMousemove,
        onClick: function onClick(event) {
          event.nativeEvent.preventDefault()
          if (!event.module) return
          handleMousemove({ ...event, module: null })
          this.zoom(event)
        },
        onMouseWheel: function onMouseWheel(event) {
          // wheelDelta has been deprecated
          const { clientX, clientY, deltaY } = event.nativeEvent
          const isZoomOut = deltaY > 0
          if (isZoomOut) {
            // this.zoomOut()
          } else {
            //
          }
        }
      })
      window.addEventListener('resize', resize)
    }
    return () => {
      if (!treemapInstance.current) return
      window.removeEventListener('resize', resize)
      treemapInstance.current?.dispose()
      treemapInstance.current = null
    }
  }, [visibleChunks, handleMousemove])

  return <div ref={containerRef} stylex={{ height: '100%', width: '100%', position: 'relative' }} />
})
