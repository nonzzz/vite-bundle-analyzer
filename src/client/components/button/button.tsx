import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useClasses, useScale, withScale } from '../../composables'
import type { SCALES } from '../../composables'

interface Props {
  icon?: React.ReactNode
  auto?: boolean
  type?: 'default' | 'secondary'
}

type ButtonProps = Props & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof Props>

const defaultProps: Props = {
  auto: false,
  type: 'default'
} 

const styles = stylex.create({
  button: {
    boxSizing: 'border-box',
    display: 'inline-block',
    borderRadius: '6px',
    fontWeight: 400,
    userSelect: 'none',
    outline: 'none',
    textTransform: 'capitalize',
    justifyContent: 'center',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    transition: 'background-color 200ms ease 0s, box-shadow 200ms ease 0ms, border 200ms ease 0ms, color 200ms ease 0ms',
    position: 'relative',
    overflow: 'hidden',
    color: {
      default: '#666',
      ':hover': '#000'
    },
    backgroundColor: '#fff',
    border: '1px solid #eaeaea',
    cursor: 'pointer',
    width: 'initial',
    ':hover': {
      borderColor: '#000'
    }
  },
  auto: {
    width: 'auto'
  },
  layout: (scale: SCALES, auto: boolean) => ({
    minWidth: auto ? 'min-content' : scale.width(10.5),
    lineHeight: scale.height(2.5),
    fontSize: scale.font(0.875),
    height: scale.height(2.5),
    padding: `${scale.pt(0)} ${auto ? scale.pr(1.15) : scale.pr(1.375)} ${scale.pt(0)} ${auto ? scale.pl(1.15) : scale.pl(1.375)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`,
    '--button-height': scale.height(2.5),
    '--button-icon-padding': scale.pl(0.727)
  }),
  text: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 'inherit',
    top: '-1px'
  },
  icon: {
    position: 'absolute',
    right: 'auto',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    justifyContent: 'center',
    color: '#666',
    alignItems: 'center',
    zIndex: 1,
    ':not(#__unused__)  svg': {
      background: 'transparent',
      height: 'calc(var(--button-height) / 2.35)',
      width: 'calc(var(--button-height) / 2.35)'
    }
  },
  single: {
    position: 'static',
    transform: 'none'
  },
  autoPaddingLeft: {
    paddingLeft: 'calc(var(--button-height) / 2 + var(--button-icon-padding) * .5)'
  },
  autoPaddingRight: {
    paddingRight: 'calc(var(--button-height) / 2 + var(--button-icon-padding) * .5)'
  },
  secondary: {
    backgroundColor: '#000',
    borderColor: '#000',
    color: '#fff'
  }
})

function getButtonChildrenWithIcon(auto: boolean, icon: React.ReactNode, children: React.ReactNode) {
  if (!icon) return <div {...stylex.props(styles.text)}>{children}</div>
  if (icon && !children) return <span {...stylex.props(styles.icon, styles.single)}>{icon}</span>
  return (
    <>
      <span {...stylex.props(styles.icon)}>{icon}</span>
      <div {...stylex.props(styles.text)}>{children}</div>
    </>
  )
}

const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { 
    type = 'default',
    className: userClassName, style: userStyle, auto = false, 
    icon, children, ...rest
  } = props
  const { SCALES } = useScale()

  const { className, style } = stylex.props(styles.button,
    styles.layout(SCALES, auto), auto && styles.auto, type === 'secondary' && 
    styles.secondary)

  const classes = useClasses('button', className, userClassName)

  return (
    <button
      ref={ref}
      className={classes}
      style={{ ...style, ...userStyle }}
      {...rest}
      type="button"
    >
      {getButtonChildrenWithIcon(auto, icon, children)}
    </button>
  )
})

ButtonComponent.displayName = 'Button'
ButtonComponent.defaultProps = defaultProps

export const Button = withScale(ButtonComponent)
