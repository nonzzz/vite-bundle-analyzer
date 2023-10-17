import React, { useCallback, useEffect, useRef, useState } from 'react'
import style9 from 'style9'

export type TooltipProps  = React.PropsWithChildren<{
  visible: boolean
}>

const offset = {
  x: 10,
  y: 30
}

const styles = style9.create({
  container: {
    position: 'absolute',
    fontSize: '11px',
    padding: '5px 10px',
    borderRadius: '4px',
    backgroundColor: '#fff',
    border: '1px solid #aaa',
    opacity: '0.9',
    whiteSpace: 'nowrap',
    visibility: 'visible',
    transition: 'opacity .2s ease, visibility .2s ease'
  },
  hidden: {
    opacity: '0',
    visibility: 'hidden'
  }
})

export function Tooltip(props: TooltipProps) {
  const { children, visible } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{top: number, left: number}>({ top: 0, left: 0 })


  const handleMouseEvent = useCallback((event: MouseEvent) => {
    if (!visible) return
    if (!containerRef.current) return
    const pos = { top: event.pageY + offset.y, left: event.pageX + offset.x }
    const rect  = containerRef.current.getBoundingClientRect()
    setPosition((pre) => {
      if (pos.left + rect.width > window.innerWidth) {
        pos.left = window.innerWidth - rect.width
      }
      if (pos.top + rect.height > window.innerHeight) {
        pos.top = pos.top - offset.y - rect.height
      }
      return { ...pre, ...pos }
    })
  }, [visible])
 

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseEvent, true)
    return () => {
      document.removeEventListener('mousemove', handleMouseEvent, true)
    }
  }, [handleMouseEvent])

  return <div className={styles('container', !visible && 'hidden')} ref={containerRef} style={position}>
    {children}
  </div>
}
