import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function TextWithTooltip({ text, maxWidth = '500px' }: { text: string, maxWidth?: string }) {
  const textRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isPositioned, setIsPositioned] = useState(false)

  useEffect(() => {
    if (textRef.current) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth)
    }
  }, [text])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!isOverflowing) { return }

    const offset = { x: 10, y: 10 }

    const initialPos = {
      top: e.pageY - offset.y,
      left: e.pageX + offset.x
    }
    setPosition(initialPos)
    setIsPositioned(true)

    requestAnimationFrame(() => {
      setShowTooltip(true)
    })
  }, [isOverflowing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showTooltip || !isOverflowing) { return }

    const offset = { x: 10, y: 10 }
    const pos = {
      top: e.pageY - offset.y,
      left: e.pageX + offset.x
    }

    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      if (pos.left + rect.width > window.innerWidth) {
        pos.left = window.innerWidth - rect.width - 10
      }
      if (pos.top + rect.height > window.innerHeight) {
        pos.top = pos.top - rect.height - offset.y
      }
    }

    setPosition(pos)
  }, [showTooltip, isOverflowing])

  return (
    <>
      <div
        ref={textRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setShowTooltip(false)
          setIsPositioned(false)
        }}
        stylex={{
          display: 'block',
          maxWidth,
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          fontSize: '14px'
        }}
      >
        {text}
      </div>

      {showTooltip && isPositioned && isOverflowing && createPortal(
        <div
          ref={tooltipRef}
          style={{
            top: position.top,
            left: position.left
          }}
          stylex={{
            position: 'absolute',
            backgroundColor: 'rgba(51, 51, 51, 0.95)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '600px',
            wordBreak: 'break-all',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  )
}
