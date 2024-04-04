import React, { useMemo } from 'react'
import * as stylex from '@stylexjs/stylex'
import { useScale, withScale } from '@geist-ui/core'
import { SCALES } from '../button'
import { Ellipsis } from './ellipsis'
import { useSelect } from './context'

interface Props {
  value?: string
  disabled?: boolean
  preventAllEvents?: boolean
}

export type SelectOptionProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

const defaultProps: Props = {
  disabled: false,
  preventAllEvents: false
}

const styles = stylex.create({
  option: {
    display: 'flex',
    maxWidth: '100%',
    boxSizing: 'border-box',
    justifyContent: 'flex-start',
    alignItems: 'center',
    fontWeight: 'normal',
    userSelect: 'none',
    border: 0,
    transition: 'background 0.2s ease 0s, border-color 0.2s ease 0s'
  },
  layout: (scale: SCALES, backgroundColor: string, backgroundHoverColor: string, color: string, disabled: boolean) => ({
    backgroundColor: {
      default: backgroundColor,
      ':hover': backgroundHoverColor
    },
    color: {
      default: color,
      ':hover': '#333'
    },
    cursor: disabled ? 'not-allowed' : 'pointer',
    '--select-font-size': scale.font(0.75),
    fontSize: 'var(--select-font-size)',
    width: scale.width(1, '100%'),
    height: scale.height(2.25),
    padding: `${scale.pt(0)} ${scale.pr(0.667)} ${scale.pb(0)} ${scale.pl(0.667)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`
  })
})

function SelectOptionComponent(props: React.PropsWithChildren<SelectOptionProps>) {
  const { children, value: initialValue, preventAllEvents, disabled = false, ...rest } = props
  const { SCALES } = useScale()
  const { disableAll, value, updateValue } = useSelect()
  const isDisabled = useMemo(() => disabled || disableAll, [disabled, disableAll])

  const selected = useMemo(() => {
    if (!value) return false
    if (typeof value === 'string') return initialValue === value
    return value.includes(initialValue + '')
  }, [value, initialValue])

  const color = useMemo(() => {
    if (isDisabled) return '#888'
    return selected ? '#000' : '#666'
  }, [selected, isDisabled])

  const bgColor = useMemo(() => {
    if (isDisabled) return '#fafafa'
    return selected ? '#eaeaea' : '#fff'
  }, [selected, isDisabled])

  const hoverBgColor = useMemo(() => {
    if (isDisabled || selected) return bgColor
    return '#fafafa'
  }, [isDisabled, bgColor, selected])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (preventAllEvents) return
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    event.preventDefault()
    if (isDisabled) return
    updateValue?.(initialValue!)
  }

  return (
    <div
      role="presentation"
      {...stylex.props(styles.option, styles.layout(SCALES, bgColor, hoverBgColor, color, isDisabled))}
      onClick={handleClick}
      {...rest}
    >
      <Ellipsis height={SCALES.height(2.25)}>{children}</Ellipsis>
    </div>
  )
}

SelectOptionComponent.displayName = 'SelectOption'
SelectOptionComponent.defaultProps = defaultProps

export const SelectOption = withScale(SelectOptionComponent)
