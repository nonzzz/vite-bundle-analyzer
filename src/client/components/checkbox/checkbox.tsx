import React, { useCallback, useEffect, useState } from 'react'
import { useClasses, useScale, withScale } from '@geist-ui/core'
import * as stylex from '@stylexjs/stylex'
import { SCALES } from '../button'
import { useCheckbox } from './context'

export interface CheckboxEventTarget {
  checked: boolean
}

export interface CheckboxEvent {
  target: CheckboxEventTarget
  stopPropagation: () => void
  preventDefault: () => void
  nativeEvent: React.ChangeEvent
}
  
interface CheckboxIconProps {
  checked: boolean
  disabled: boolean
}

interface Props {
  checked?: boolean
  disabled?: boolean
  value?: string
  onChange?: (e: CheckboxEvent) => void
}

export type CheckboxProps = Props & Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof Props>

const defaultProps: Props = {
  disabled: false,
  value: ''
}

const styles = stylex.create({
  checkbox: (scale: SCALES, disabled) => ({
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    '--checkbox-size': scale.font(0.875),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.75 : 1,
    lineHeight: 'var(--checkbox-size)',
    width: scale.width(1, 'auto'),
    height: scale.height(1, 'var(--checkbox-size)'),
    padding: `${scale.pt(0)} ${scale.pr(0)} ${scale.pb(0)} ${scale.pl(0)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`
  }),
  text: (disabled) => ({
    fontSize: 'var(--checkbox-size)',
    lineHeight: 'var(--checkbox-size)',
    paddingLeft: 'calc(var(--checkbox-size) * 0.5)',
    userSelect: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer'
  }),
  input: {
    opacity: 0,
    outline: 'none',
    position: 'absolute',
    width: 0,
    height: 0,
    margin: 0,
    padding: 0,
    zIndex: -1,
    fontSize: 0,
    backgroundColor: 'transparent'
  },
  svg: (disabled) => ({
    display: 'inline-flex',
    width: 'calc(var(--checkbox-size) * 0.86)',
    height: 'calc(var(--checkbox-size) * 0.86)',
    userSelect: 'none',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer'
  })
})

function CheckboxIcon(props: CheckboxIconProps) {
  const { checked, disabled } = props
  const c = stylex.props(styles.svg(disabled))
  
  if (checked) {
    return (
      <svg viewBox="0 0 17 16" fill="none" {...c}>
        <path
          fill="#000"
          d="M12.1429 0H3.85714C1.7269 0 0 1.79086 0 4V12C0 14.2091 1.7269 16 3.85714 16H12.1429C14.2731 16 16 14.2091 16 12V4C16 1.79086 14.2731 0 12.1429 0Z"
        />
        <path d="M16 3L7.72491 11L5 8" stroke="#fff" strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 12 12" fill="none" {...c}>
      <path
        stroke="#666"
        d="M8.5 0.5H3.5C1.84315 0.5 0.5 1.84315 0.5 3.5V8.5C0.5 10.1569 1.84315 11.5 3.5 11.5H8.5C10.1569 11.5 11.5 10.1569 11.5 8.5V3.5C11.5 1.84315 10.1569 0.5 8.5 0.5Z"
      />
    </svg>
  )
}

function CheckboxComponent(props: CheckboxProps) {
  const { 
    checked, className: userClassName, style: userStyle, 
    value, disabled = false, onChange, children, ...rest } =
     props
  const { disabledAll, inGroup, values, updateState } = useCheckbox()
  const { SCALES } = useScale()
  const { className, style } = stylex.props(styles.input)
  const classes = useClasses(className, userClassName)
  const [selfChecked, setSelfChecked] = useState<boolean>(false)
  const isDisabled = inGroup ? disabledAll || disabled : disabled

  const handleChange = useCallback((e: React.ChangeEvent) => {
    if (disabled) return
    const evt: CheckboxEvent = {
      target: {
        checked: !selfChecked
      },
      stopPropagation: e.stopPropagation,
      preventDefault: e.preventDefault,
      nativeEvent: e
    }
    if (inGroup) {
      updateState(value || '', !selfChecked)
    }
    setSelfChecked(pre => !pre)
    onChange?.(evt)
  }, [onChange, disabled, selfChecked, value, inGroup, updateState])

  useEffect(() => {
    if (checked === undefined) return
    setSelfChecked(checked)
  }, [checked])

  useEffect(() => {
    if (inGroup) {
      if (!values.length) return setSelfChecked(false)
      const next = values.includes(value || '')
      if (next === selfChecked) return
      setSelfChecked(next)
    } 
  }, [value, values, selfChecked, inGroup])

  return (
    <label {...stylex.props(styles.checkbox(SCALES, isDisabled))}>
      <CheckboxIcon checked={selfChecked} disabled={disabled} />
      <input
        disabled={isDisabled}
        onChange={handleChange}
        checked={selfChecked}
        className={classes}
        style={{ ...style, ...userStyle }}
        type="checkbox"
        {...rest}
      />
      <span {...stylex.props(styles.text(isDisabled))}>{children}</span>
    </label>
  )
}

CheckboxComponent.defaultProps = defaultProps
CheckboxComponent.displayName = 'Checkbox'

export const Checkbox = withScale(CheckboxComponent)
