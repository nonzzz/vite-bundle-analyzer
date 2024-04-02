import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useClasses, useScale, withScale } from '@geist-ui/core'
import type { SCALES } from '../button'

interface Props {
  clearable?: boolean
}

type InputProps = Props & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof Props>

const styles = stylex.create({
  label: (scale: SCALES) => ({
    fontSize: scale.font(0.875),
    width: scale.width(1, 'initial'),
    padding: `${scale.pt(0)} ${scale.pr(0)} ${scale.pb(0)} ${scale.pl(0)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`,
    '--input-height': scale.height(2.25)
  }),
  container: (scale: SCALES) => ({
    display: 'inline-flex',
    alignItems: 'center',
    width: scale.width(1, 'initial'),
    height: 'var(--input-height)'
  }),
  wrapper: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    alignItems: 'center',
    height: '100%',
    flex: 1,
    userSelect: 'none',
    borderRadius: '6px',
    border: '1px solid #666',
    transition: 'border 0.2s ease 0s, color 0.2s ease 0s'
  },
  input: (scale: SCALES) => ({
    padding: 0,
    boxShadow: 'none',
    margin: '0 0.25em 0.625em',
    fontSize: scale.font(0.875),
    backgroundColor: 'transparent',
    border: 'none',
    color: '#000',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    minWidth: 0,
    WebkitAppearance: 'none'
  })
})

const InputComponent = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className: userClassName, style: userStyle, type, ...rest } = props

  const { SCALES } = useScale()
  const { className, style } = stylex.props(styles.input(SCALES))

  const classes = useClasses('input', className, userClassName)

  return (
    <div {...stylex.props(styles.label(SCALES))}>
      <div {...stylex.props(styles.container(SCALES))}>
        <div {...stylex.props(styles.wrapper)}>
          <input type={type} ref={ref} className={classes} style={{ ...style, ...userStyle }} {...rest} />
        </div>
      </div>
    </div>
  )
})
  
InputComponent.displayName = 'Input'

export const Input = withScale(InputComponent)
