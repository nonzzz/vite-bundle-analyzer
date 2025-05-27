import { inline } from '@stylex-extend/core'
import * as stylex from '@stylexjs/stylex'
import { clsx } from 'clsx'
import React, { useEffect, useRef } from 'react'
import { useScale } from '../../composables'
import { isChildElement } from '../../shared'
import { CSSTransition } from '../css-transition'

interface Props {
  visible?: boolean
}

export type ModalWrapperProps = Omit<React.HTMLAttributes<unknown>, keyof Props> & Props

function ModalWrapper(props: React.PropsWithChildren<ModalWrapperProps>) {
  const { visible, children, ...rest } = props
  const { SCALES } = useScale()
  const modalContent = useRef<HTMLDivElement>(null)
  const tabStart = useRef<HTMLDivElement>(null)
  const tabEnd = useRef<HTMLDivElement>(null)
  const { className, style } = stylex.props(inline({
    position: 'relative',
    bottom: 0,
    maxWidth: '100%',
    verticalAlign: 'middle',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: '6px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)',
    opacity: 0,
    outline: 'none',
    transform: 'translate3d(0px, -30px, 0px)',
    transition: 'opacity 0.3s cubic-bezier(0.33, 1, 0.68, 1), transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)',
    ':not(#_).wrapper-enter': {
      opacity: 0,
      transform: 'translate3d(0px, -30px, 0px)'
    },
    ':not(#_).wrapper-enter-active': {
      opacity: 1,
      transform: 'translate3d(0px, 0px, 0px)'
    },
    ':not(#_).wrapper-leave': {
      opacity: 0.5,
      transition: 'translate3d(0px, 0px, 0px)'
    },
    ':not(#_).wrapper-leave-active': {
      opacity: 0,
      transform: ' translate3d(0px, -30px, 0px)'
    },
    fontSize: SCALES.font(1),
    '--wrapper-padding-left': SCALES.pl(1.3125),
    '--wrapper-padding-right': SCALES.pr(1.3125),
    padding: `${SCALES.pt(1.3125)} var(--wrapper-padding-right) ${SCALES.pb(1.3125)} var(--wrapper-padding-left)`,
    margin: `${SCALES.mt(0)} ${SCALES.mr(0)} ${SCALES.mb(0)} ${SCALES.ml(0)}`,
    width: SCALES.width(1, 'auto'),
    height: SCALES.height(1, '100%')
  }))
  const classes = clsx(className, 'wrapper')

  useEffect(() => {
    if (!visible) { return }
    const activeElement = document.activeElement
    const isChild = isChildElement(modalContent.current, activeElement)
    if (isChild) { return }
    if (tabStart.current) {
      tabStart.current.focus()
    }
  }, [visible])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isTabDown = event.keyCode === 9
    if (!visible || !isTabDown) { return }
    const activeElement = document.activeElement
    if (event.shiftKey) {
      if (activeElement === tabStart.current) {
        if (tabEnd.current) {
          tabEnd.current.focus()
        }
      }
    } else {
      if (activeElement === tabEnd.current) {
        if (tabStart.current) {
          tabStart.current.focus()
        }
      }
    }
  }

  return (
    <CSSTransition name="wrapper" visible={visible} clearTime={300}>
      <div role="dialog" tabIndex={-1} className={classes} style={style} onKeyDown={onKeyDown} ref={modalContent} {...rest}>
        <div tabIndex={0} className="hide-tab" aria-hidden="true" ref={tabStart} />
        {children}
        <div tabIndex={0} className="hide-tab" aria-hidden="true" ref={tabEnd} />
      </div>
    </CSSTransition>
  )
}

export { ModalWrapper }
