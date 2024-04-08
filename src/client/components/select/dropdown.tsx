import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { createPortal } from 'react-dom'
import { CSSTransition } from '../css-transition'
import { useClickAnyWhere, useDOMObserver, usePortal, useResize } from '../../composables'
import { getRefRect } from './layouts'
import { useSelect } from './context'

interface Props {
  visible: boolean
}
  
export type SelectDropdownProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

interface ReactiveDomReact {
  top: number
  left: number
  right: number
  width: number
}

const defaultRect: ReactiveDomReact = {
  top: -1000,
  left: -1000,
  right: -1000,
  width: 0
}

const styles = stylex.create({
  dropdown: (rect: ReactiveDomReact) => ({
    position: 'absolute',
    zIndex: 1100,
    top: `${rect.top + 2}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  }),
  inner: {
    borderRadius: '6px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)',
    backgroundColor: '#fff',
    maxHeight: '17em',
    overflowY: 'auto',
    overflowAnchor: 'none',
    padding: '0.38em 0',
    scrollBehavior: 'smooth'
  }
})

const SelectDropdown = React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<SelectDropdownProps>
  >(({ visible, children }, dropdownRef) => {
    const [rect, setRect] = useState<ReactiveDomReact>(defaultRect)
    const internalDropdownRef = useRef<HTMLDivElement | null>(null)
    const { ref } = useSelect()

    const el = usePortal('dropdown')
    
    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      dropdownRef,
      () => internalDropdownRef.current
    )

    const updateRect = useCallback(() => {
      const {
        top,
        left,
        right,
        width: nativeWidth
      } = getRefRect(ref)
      setRect({ top, left, right, width: nativeWidth })
    }, [ref])

    useResize(updateRect)
    
    useClickAnyWhere(() => {
      const { top, left } = getRefRect(ref)
      const shouldUpdatePosition = top !== rect.top || left !== rect.left
      if (!shouldUpdatePosition) return
      updateRect()
    })
    useDOMObserver(ref, () => {
      updateRect()
    })
    useEffect(() => {
      if (!ref || !ref.current) return
      ref.current.addEventListener('mouseenter', updateRect)
      /* istanbul ignore next */
      return () => {
        if (!ref || !ref.current) return
        ref.current.removeEventListener('mouseenter', updateRect)
      }
    }, [ref, updateRect])

    const clickHandler = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
      event.preventDefault()
    }
    const mouseDownHandler = (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
    }
    
    if (!ref || !el) return null

    return createPortal(
      <CSSTransition visible={visible}>
        <div
          role="presentation" 
          onClick={clickHandler}
          onMouseDown={mouseDownHandler}
          {...stylex.props(styles.dropdown(rect))}
        >
          <div ref={internalDropdownRef} {...stylex.props(styles.inner)}>
            {children}
          </div>
        </div>
      </CSSTransition>, 
      el
    )
  }
  )
  
SelectDropdown.displayName = 'SelectDropdown'

export { SelectDropdown }
