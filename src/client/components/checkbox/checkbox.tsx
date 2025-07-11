import { inline } from '@stylex-extend/core'
import * as stylex from '@stylexjs/stylex'
import { clsx } from 'clsx'
import React, { useCallback, useEffect, useReducer } from 'react'
import { useScale, withScale } from '../../composables'
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

interface CheckboxState {
  checked: boolean
}

type CheckboxAction =
  | { type: 'SET_CHECKED', payload: boolean }
  | { type: 'TOGGLE' }
  | { type: 'SYNC_GROUP', payload: boolean }
  | { type: 'SYNC_PROP', payload: boolean }

function checkboxReducer(state: CheckboxState, action: CheckboxAction): CheckboxState {
  switch (action.type) {
    case 'SET_CHECKED':
      return { checked: action.payload }
    case 'TOGGLE':
      return { checked: !state.checked }
    case 'SYNC_GROUP':
      return { checked: action.payload }
    case 'SYNC_PROP':
      return { checked: action.payload }
    default:
      return state
  }
}

function CheckboxIcon(props: CheckboxIconProps) {
  const { checked, disabled } = props
  const c = stylex.props(inline({
    display: 'inline-flex',
    width: 'calc(var(--checkbox-size) * 0.86)',
    height: 'calc(var(--checkbox-size) * 0.86)',
    userSelect: 'none',
    opacity: 1,
    cursor: 'pointer',
    ...(disabled && { opacity: 0.4, cursor: 'not-allowed' })
  }))

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
    checked = false,
    className: userClassName,
    style: userStyle,
    value = '',
    disabled = false,
    onChange,
    children,
    ...rest
  } = props
  const { disabledAll, inGroup, values, updateState } = useCheckbox()
  const { SCALES } = useScale()

  const [state, dispatch] = useReducer(checkboxReducer, {
    checked: inGroup ? values.includes(value) : checked
  })

  useEffect(() => {
    if (!inGroup && checked !== state.checked) {
      dispatch({ type: 'SYNC_PROP', payload: checked })
    }
  }, [checked, inGroup, state.checked])

  useEffect(() => {
    if (inGroup) {
      if (!value.length) {
        dispatch({ type: 'SET_CHECKED', payload: false })
      } else {
        const isCheckedInGroup = values.includes(value)
        if (isCheckedInGroup !== state.checked) {
          dispatch({ type: 'SYNC_GROUP', payload: isCheckedInGroup })
        }
      }
    }
  }, [inGroup, value, values, state.checked])

  const { className, style } = stylex.props(inline({
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
  }))
  const classes = clsx(className, userClassName)
  const isDisabled = inGroup ? disabledAll || disabled : disabled

  const handleChange = useCallback((e: React.ChangeEvent) => {
    if (disabled) { return }

    const nextChecked = !state.checked
    const evt: CheckboxEvent = {
      target: { checked: nextChecked },
      stopPropagation: () => e.stopPropagation(),
      preventDefault: () => e.preventDefault(),
      nativeEvent: e
    }

    if (inGroup) {
      updateState(value, nextChecked)
    }

    dispatch({ type: 'TOGGLE' })
    onChange?.(evt)
  }, [disabled, state.checked, inGroup, updateState, value, onChange])

  return (
    <label
      stylex={{
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        '--checkbox-size': SCALES.font(0.875),
        cursor: 'pointer',
        opacity: 1,
        ...(isDisabled && { cursor: 'not-allowed', opacity: 0.75 }),
        lineHeight: 'var(--checkbox-size)',
        width: SCALES.width(1, 'auto'),
        height: SCALES.height(1, 'var(--checkbox-size)'),
        padding: `${SCALES.pt(0)} ${SCALES.pr(0)} ${SCALES.pb(0)} ${SCALES.pl(0)}`,
        margin: `${SCALES.mt(0)} ${SCALES.mr(0)} ${SCALES.mb(0)} ${SCALES.ml(0)}`
      }}
    >
      <CheckboxIcon checked={state.checked} disabled={disabled} />
      <input
        disabled={isDisabled}
        onChange={handleChange}
        checked={state.checked}
        className={classes}
        style={{ ...style, ...userStyle }}
        type="checkbox"
        {...rest}
      />
      <span
        stylex={{
          fontSize: 'var(--checkbox-size)',
          lineHeight: 'var(--checkbox-size)',
          paddingLeft: 'calc(var(--checkbox-size) * 0.5)',
          userSelect: 'none',
          cursor: 'pointer',
          ...(isDisabled && { cursor: 'not-allowed' })
        }}
      >
        {children}
      </span>
    </label>
  )
}

export const Checkbox = withScale(CheckboxComponent)
