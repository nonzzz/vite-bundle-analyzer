import React, { useEffect, useRef } from 'react'
import * as stylex from '@stylexjs/stylex'

interface Props {
  x: number
  y: number
  onCompleted: () => void
  color: string
}

export type ButtonDrip = Props

const expand = stylex.keyframes({
  '0%': {
    opacity: 0,
    transform: 'scale(1)'
  },
  '30%': {
    opacity: 1
  },
  '80%': {
    opacity: 0.5
  },
  '100%': {
    transform: 'scale(28)',
    opacity: 0
  }
})

const ButtonDrip: React.FC<ButtonDrip> = ({
  x = 0,
  y = 0,
  color,
  onCompleted
}) => {
  const dripRef = useRef<HTMLDivElement>(null)
  const top = Number.isNaN(+y) ? 0 : y - 10
  const left = Number.isNaN(+x) ? 0 : x - 10

  useEffect(() => {
    if (!dripRef.current) return
    dripRef.current.addEventListener('animationend', onCompleted)
    return () => {
      if (!dripRef.current) return
      dripRef.current.removeEventListener('animationend', onCompleted)
    }
  })

  return (
    <div
      ref={dripRef}
      stylex={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        stylex={{
          position: 'absolute',
          top,
          left,
          animationName: expand,
          animationDuration: '350ms',
          animationTimingFunction: 'ease-in',
          animationFillMode: 'forwards',
          width: '1rem',
          height: '1rem'
        }}
      >
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g fill={color}>
            <rect width="100%" height="100%" rx="10" />
          </g>
        </g>
      </svg>
    </div>
  )
}

ButtonDrip.displayName = 'GeistButtonDrip'
export default ButtonDrip
