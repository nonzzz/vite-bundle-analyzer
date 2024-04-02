import React, { useImperativeHandle, useRef, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { useClasses, useScale, withScale } from '@geist-ui/core'
import type { SCALES } from '../button'

interface Props {
  clearable?: boolean
}

type InputProps = Props & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof Props>

const styles = stylex.create({
  label: (scale: SCALES) => ({
    display: 'inline-block',
    boxSizing: 'border-box',
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
    margin: '0.25em 0.625em',
    fontSize: scale.font(0.875),
    backgroundColor: 'transparent',
    border: 'none',
    color: '#000',
    outline: 'none',
    borderRadius: 0,
    width: '100%',
    minWidth: 0,
    WebkitAppearance: 'none',
    '::placeholder': {
      color: '#999'
    }
  }),
  clear: (visible, disabled) => ({
    boxSizing: 'border-box',
    display: 'inline-flex',
    width: 'calc(var(--input-height) -2px)',
    height: '100%',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'color 150ms ease 0s',
    margin: 0,
    padding: 0,
    color: {
      default: '#999',
      ':hover': disabled ? '#999' : '#000'
    },
    visibility: visible ? 'visible' : 'hidden',
    opacity: visible ? 1 : 0
  }),
  svg: {
    color: 'currentColor',
    width: 'calc(var(--input-height) - 2px)',
    height: 'calc(var(--input-height) - 2px)',
    transform: 'scale(0.4)'
  }

})

function simulateChangeEvent(el: HTMLInputElement,
  event: React.MouseEvent<HTMLDivElement>) {
  return {
    ...event,
    target: el,
    currentTarget: el
  }
}

const InputComponent = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { 
    className: userClassName, style: userStyle, clearable,
    disabled, readOnly, value,
    type,
    onChange,
    ...rest 
  } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const [selfValue, setSelfValue] = useState<string>()
  const { SCALES } = useScale()
  const { className, style } = stylex.props(styles.input(SCALES))

  useImperativeHandle(ref, () => inputRef.current!)

  const classes = useClasses('input', className, userClassName)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return
    setSelfValue(e.target.value)
    onChange?.(e)
  }

  const handleClear = (event: React.MouseEvent<HTMLDivElement>) => {
    setSelfValue('')
    if (!inputRef.current) return
    const changeEvent = simulateChangeEvent(inputRef.current, event)
    changeEvent.target.value = ''
    onChange?.(changeEvent)
    inputRef.current.focus()
  }

  return (
    <div {...stylex.props(styles.label(SCALES))}>
      <div {...stylex.props(styles.container(SCALES))}>
        <div {...stylex.props(styles.wrapper)}>
          <input
            type={type}
            ref={inputRef}
            value={selfValue}
            className={classes}
            disabled={disabled}
            readOnly={readOnly}
            onChange={handleChange}
            style={{ ...style, ...userStyle }}
            {...rest}
          />
          {clearable && (
            <div
              role="presentation"
              onClick={handleClear}
              {...stylex.props(styles.clear(!!selfValue, disabled || readOnly))}
            >
              <svg
                {...stylex.props(styles.svg)}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                shapeRendering="geometricPrecision"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
  
InputComponent.displayName = 'Input'

export const Input = withScale(InputComponent)
