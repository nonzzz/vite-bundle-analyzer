import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useScale, withScale } from '../../composables'
import { Provider } from './context'
import { SelectDropdown } from './dropdown'
import { Ellipsis } from './ellipsis'
import { SelectMultipleValue } from './select-multiple'

interface Props {
  disabled?: boolean
  value?: string | string[]
  placeholder?: string
  multiple?: boolean
  onChange?: (value: string | string[]) => void
  clearable?: boolean
}

export type SelectProps = Omit<React.HTMLAttributes<unknown>, keyof Props> & Props

export type SelectInstance = {
  destory: () => void
}

function getSelectValue(value: string | string[] | undefined, next: string, multiple: boolean) {
  if (multiple) {
    if (!Array.isArray(value)) { return [next] }
    if (!value.includes(next)) { return [...value, next] }
    return value.filter((item) => item !== next)
  }
  return next
}

function pickChildByProps(children: ReactNode | undefined, key: string, value: string | string[] | undefined) {
  const target: ReactNode[] = []
  const isArray = Array.isArray(value)
  const withoutPropChildren = React.Children.map(children, (item) => {
    if (!React.isValidElement(item)) { return null }
    if (!item.props) { return item }
    if (isArray) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (value.includes(item.props[key])) {
        target.push(item)
        return null
      }
      return item
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (item.props[key] === value) {
      target.push(item)
      return null
    }
    return item
  })
  const targetChildren = target.length >= 0 ? target : undefined

  return [withoutPropChildren, targetChildren]
}

const SelectComponent = React.forwardRef((props: SelectProps, ref: React.Ref<SelectInstance>) => {
  const { disabled = false, value: userValue, placeholder, clearable = true, multiple = false, children, onChange, ...rest } = props

  const elementRef = useRef<HTMLDivElement>(null)

  const { SCALES } = useScale()
  const [visible, setVisible] = useState<boolean>(false)

  const [value, setValue] = useState<string | string[] | undefined>(() => {
    if (!multiple) { return userValue }
    if (Array.isArray(userValue)) { return userValue }
    return typeof userValue === 'undefined' ? [] : [userValue]
  })

  const isEmpty = useMemo(() => {
    if (!Array.isArray(value)) { return !value }
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
    const [, optionChildren] = pickChildByProps(children, 'value', value)
    return React.Children.map(optionChildren, (child) => {
      if (!React.isValidElement(child)) { return null }
      // @ts-expect-error safe
      const el = React.cloneElement(child, { preventAllEvents: true })
      if (!multiple) { return el }
      return (
        <SelectMultipleValue
          disabled={disabled}
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      ref: elementRef,
      updateValue,
      updateVisible
    }
  }, [visible, value, disabled, updateValue])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.preventDefault()
    if (disabled) { return }
    updateVisible(!visible)
    event.preventDefault()
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (visible) {
      event.preventDefault()
    }
  }

  useImperativeHandle(ref, () => {
    return {
      destory: () => updateVisible(false)
    }
  })

  return (
    <Provider value={initialValue}>
      <div
        ref={elementRef}
        role="presentation"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        stylex={{
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
          ':hover': {
            borderColor: '#000'
          },
          ...(disabled && { ':hover': { borderColor: '#eaeaea' } }),
          '--select-font-size': SCALES.font(0.875),
          '--select-height': SCALES.height(2.25),
          '--disabled-color': disabled ? '#888' : '#000',
          width: SCALES.width(1, 'initial'),
          height: multiple ? 'auto' : 'var(--select-height)',
          padding: `${SCALES.pt(0)} ${SCALES.pr(0.334)} ${SCALES.pb(0)} ${SCALES.pl(0.667)}`,
          margin: `${SCALES.mt(0)} ${SCALES.mr(0)} ${SCALES.mb(0)} ${SCALES.ml(0)}`,
          cursor: 'pointer',
          ...(disabled && { cursor: 'not-allowed' }),
          minHeight: multiple ? 'var(--select-height)' : '11.5em'
        }}
        {...rest}
      >
        <input
          aria-haspopup="listbox"
          readOnly
          stylex={{
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
          }}
        />
        {isEmpty && (
          <span
            stylex={{
              display: 'inline-flex',
              flex: 1,
              height: 'var(--select-height)',
              alignItems: 'center',
              lineHeight: 1,
              padding: 0,
              marginRight: '1.25em',
              fontSize: 'var(--select-font-size)',
              color: '#999',
              ':not(#_) div': {
                borderRadius: 0,
                backgroundColor: 'transparent',
                padding: 0,
                margin: 0,
                color: 'inherit'
              },
              ':not(#_) div:hover': {
                borderRadius: 0,
                backgroundColor: 'transparent',
                padding: 0,
                margin: 0,
                color: 'inherit'
              }
            }}
          >
            <Ellipsis height="var(--scale-height)">{placeholder}</Ellipsis>
          </span>
        )}
        {value && <div stylex={{ display: 'flex', flexWrap: 'wrap' }}>{selectChild}</div>}
        <SelectDropdown visible={visible}>{children}</SelectDropdown>
        <div
          stylex={{
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
            ':not(#_) svg': {
              color: 'inherit',
              stroke: 'currentColor',
              transition: 'all 200ms ease',
              width: '1.214em',
              height: '1.214em'
            },
            ...(visible && { transform: 'translateY(-50%) rotate(180deg)' })
          }}
        >
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
})

export const Select = withScale(SelectComponent)
