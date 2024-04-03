import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useScale, withScale } from '@geist-ui/core'
import { SCALES } from '../button'

interface Props {
  disabled?: boolean
  value?: string | string[]
  placeholder?: string
  multiple?: boolean
  onChange?: (value: string | string[]) => void
  clearable?: boolean
}

export type SelectProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

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
    minWidth: '11.5em'
  },
  layout: (scale: SCALES, disabled: boolean) => ({
    '--select-font-size': scale.font(0.875),
    '--scale-height': scale.height(2.25),
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
  }
})

function SelectComponent(props: SelectProps) {
  const { disabled = false, placeholder, ...rest } = props
  const { SCALES } = useScale()
  //    {...rest}
  return (
    <div {...stylex.props(styles.select, styles.layout(SCALES, disabled))}>
      <input
        aria-haspopup="listbox"
        readOnly
        {...stylex.props(styles.input)}
      />
      <span>{placeholder}</span>
    </div>
  )
}

export const Select = withScale(SelectComponent)
