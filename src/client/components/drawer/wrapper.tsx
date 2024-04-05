import React from 'react'
import { useClasses, useScale } from '@geist-ui/core'
import CSSTransition from '@geist-ui/core/esm/shared/css-transition'
import * as stylex from '@stylexjs/stylex'
import type { SCALES } from '../button'

interface Props {
  visible?: boolean
}

export type DrawerWrapperProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

const styles = stylex.create({
  wrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 'auto',
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
    transform: 'translate3d(-100%, 0, 0)',
    transition: 'opacity, transform 400ms cubic-bezier(0.1, 0.6, 0.1, 1)',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    ':not(#__unused__).wrapper-enter': {
      opacity: 0,
      transform: 'translate3d(-100%, 0, 0)'
    },
    ':not(#__unused__).wrapper-enter-active': {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)'
    },
    ':not(#__unused__).wrapper-leave': {
      opacity: 1,
      transition: 'opacity, transform 400ms cubic-bezier(0.1, 0.2, 0.1, 1)'
    },
    ':not(#__unused__).wrapper-leave-active': {
      opacity: 0.4,
      transform: 'translate3d(-100%, 0, 0)'
    } 
  },
  layout: (scale: SCALES) => ({
    fontSize: scale.font(1),
    '--wrapper-padding-left': scale.pl(1.3125),
    '--wrapper-padding-right': scale.pr(1.3125),
    padding: `${scale.pt(1.3125)} var(--wrapper-padding-right) ${scale.pb(1.3125)} var(--wrapper-padding-left)`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`,
    width: scale.width(1, 'auto'),
    height: scale.height(1, '100%')
  })
})

function DrawerWrapper(props: React.PropsWithChildren<DrawerWrapperProps>) {
  const { visible, children } = props
  const { SCALES } = useScale()
  const { className, style } = stylex.props(styles.wrapper, styles.layout(SCALES))
  const classes = useClasses(className, 'wrapper')

  return (
    <CSSTransition name="wrapper" visible={visible} clearTime={300}>
      <div role="dialog" tabIndex={-1} className={classes} style={style}>
        {children}
      </div>
    </CSSTransition>
  )
}

DrawerWrapper.displayName = 'DrawerWrapper'

export { DrawerWrapper }
