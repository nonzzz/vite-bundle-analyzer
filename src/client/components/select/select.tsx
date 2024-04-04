import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { Grid, useScale, withScale } from '@geist-ui/core'
import { SCALES } from '../button'
import { Provider } from './context'
import { Ellipsis } from './ellipsis'
import { SelectMultipleValue } from './select-multiple'
import { SelectDropdown } from './dropdown'

interface Props {
  disabled?: boolean
  value?: string | string[]
  placeholder?: string
  multiple?: boolean
  onChange?: (value: string | string[]) => void
  clearable?: boolean
}

export type SelectProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

function getSelectValue(value: string | string[] | undefined, next: string, multiple: boolean) {
  if (multiple) {
    if (!Array.isArray(value)) return [next]
    if (!value.includes(next)) return [...value, next]
    return value.filter(item => item !== next)
  }
  return next
}

function pickChildByProps(children: ReactNode | undefined, key: string, value: any) {
  const target: ReactNode[] = []
  const isArray = Array.isArray(value)
  const withoutPropChildren = React.Children.map(children, item => {
    if (!React.isValidElement(item)) return null
    if (!item.props) return item
    if (isArray) {
      if (value.includes(item.props[key])) {
        target.push(item)
        return null
      }
      return item
    }
    if (item.props[key] === value) {
      target.push(item)
      return null
    }
    return item
  })
  const targetChildren = target.length >= 0 ? target : undefined

  return [withoutPropChildren, targetChildren]
}

const styles = stylex.create({
  select: {
    display: 'inline-flex',
    alignItems: 'center',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    position: 'relative',
    maxWidth: '90vw',
    overflow: 'hidden',
    transition: ' border 150ms ease-in 0s, color 200ms ease-out 0s, box-shadow 200ms ease 0s',
    border: '1px solid #eaeaea',
    borderRadius: '6px',
    minWidth: '11.5em',
    ':hover': {
      borderColor: '#000'
    }
  },
  disabledHoverColor: {
    ':hover': {
      borderColor: '#eaeaea'
    }
  },
  layout: (scale: SCALES, disabled: boolean) => ({
    '--select-font-size': scale.font(0.875),
    '--scale-height': scale.height(2.25),
    '--disabled-color': disabled ? '#888' : '#000',
    width: scale.width(1, 'initial'),
    height: 'var(--scale-height)',
    padding: `${scale.pt(0)} ${scale.pr(0.334)} ${scale.pb(0)} ${scale.pl(0.667)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`,
    cursor: disabled ? 'not-allowed' : 'pointer'
  }),
  input: {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    opacity: 0,
    zIndex: -1,
    width: 0,
    height: 0,
    padding: 0,
    fontSize: 0,
    border: 'none'
  },
  value: {
    display: 'inline-flex',
    flex: 1,
    height: '100%',
    alignItems: 'center',
    lineHeight: 1,
    padding: 0,
    marginRight: '1.25em',
    fontSize: 'var(--select-font-size)',
    color: 'var(--disabled-color)',
    ':not(#__unused__) div': {
      borderRadius: 0,
      backgroundColor: 'transparent',
      padding: 0,
      margin: 0,
      color: 'inherit'
    },
    ':not(#__unused__) div:hover': {
      borderRadius: 0,
      backgroundColor: 'transparent',
      padding: 0,
      margin: 0,
      color: 'inherit'
    }
  },
  placeholder: {
    color: '#999'
  },
  icon: {
    position: 'absolute',
    right: '4pt',
    fontSize: 'var(--select-font-size)',
    top: '50%',
    bottom: 0,
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    transition: 'transform 200ms ease',
    display: 'flex',
    alignItems: 'center',
    color: '#666',
    ':not(#__unused__) svg': {
      color: 'inherit',
      stroke: 'currentColor',
      transition: 'all 200ms ease',
      width: '1.214em',
      height: '1.214em'
    }
  },
  reverse: {
    transform: 'translateY(-50%) rotate(180deg)'
  }
})

function SelectComponent(props: SelectProps) {
  const { disabled = false, value: userValue, 
    placeholder, clearable = true, multiple = false, children,
    onChange, ...rest } = props
  
  const ref = useRef<HTMLDivElement>(null)
  const { SCALES } = useScale()
  const [visible, setVisible] = useState<boolean>(false)

  const [value, setValue] = useState<string | string[] | undefined>(() => {
    if (!multiple) return userValue
    if (Array.isArray(userValue)) return userValue
    return typeof userValue === 'undefined' ? [] : [userValue]
  })

  const isEmpty = useMemo(() => {
    if (!Array.isArray(value)) return !value
    return value.length === 0
  }, [value])

  const updateVisible = (next: boolean) => {
    setVisible(next)
  }

  const updateValue = useCallback((next: string) => {
    const nextValue = getSelectValue(value, next, multiple)
    setValue(nextValue)
    onChange?.(nextValue)
    if (!multiple) {
      updateVisible(false)
    }
  }, [multiple, onChange, value])

  const selectChild = useMemo(() => {
    const [,optionChildren] = pickChildByProps(children, 'value', value)
    return React.Children.map(optionChildren, child => {
      if (!React.isValidElement(child)) return null
      // @ts-expect-error
      const el = React.cloneElement(child, { preventAllEvents: true })
      if (!multiple) return el
      return (
        <SelectMultipleValue
          disabled={disabled}
          onClear={clearable ? () => updateValue(child.props.value) : null}
        >
          {el}
        </SelectMultipleValue>
      )
    })
  }, [children, value, multiple, disabled, clearable, updateValue])

  const initialValue = useMemo(() => {
    return {
      value,
      visible,
      disableAll: disabled,
      ref,
      updateValue,
      updateVisible
    }
  }, [visible, value, disabled, updateValue])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.preventDefault()
    if (disabled) return
    updateVisible(!visible)
    event.preventDefault()
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (visible) {
      event.preventDefault()
    }
  }

  return (
    <Provider value={initialValue}>
      <div
        ref={ref}
        role="presentation"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        {...stylex.props(styles.select, styles.layout(SCALES, disabled), disabled && styles.disabledHoverColor)}
        {...rest}
      >
        <input
          aria-haspopup="listbox"
          readOnly
          {...stylex.props(styles.input)}
        />
        {isEmpty && (
          <span {...stylex.props(styles.value, styles.placeholder)}>
            <Ellipsis height="var(--scale-height)">{placeholder}</Ellipsis>
          </span>
        )}
        {value && !multiple && <span>{selectChild}</span>}
        {value && multiple && <Grid.Container gap={0.5}>{selectChild}</Grid.Container>}
        <SelectDropdown visible={visible}>{children}</SelectDropdown>
        <div {...stylex.props(styles.icon, visible && styles.reverse)}>
          <svg
            viewBox="0 0 24 24"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            shapeRendering="geometricPrecision"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </Provider>
  )
}

export const Select = withScale(SelectComponent)
