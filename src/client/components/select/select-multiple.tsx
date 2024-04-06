import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useClasses } from '../../composables'

interface Props {
  disabled: boolean
  onClear: (() => void) | null
}

const styles = stylex.create({
  item: {
    display: 'inline-flex',
    justifyItems: 'center',
    alignItems: 'center',
    lineHeight: 1,
    padding: '0 0.5em',
    fontSize: 'var(--select-font-size)',
    height: 'calc(var(--select-font-size) * 2)',
    borderRadius: '6px',
    backgroundColor: '#eaeaea',
    color: '#444',
    margin: '3px',
    ':not(#__unused__) >div:not(.clear-icon)': {
      borderRadius: 0,
      backgroundColor: 'transparent',
      padding: 0,
      margin: 0,
      color: 'inherit'
    }
  },
  disabled: {
    color: '#888'
  },
  icon: {
    padding: '0 0 0 0.5em',
    margin: 0,
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'color 150ms ease 0s',
    color: {
      default: '#999',
      ':hover': '#000'
    },
    visibility: 'visible',
    opacity: 1
  },
  svg: {
    color: 'currentColor',
    width: '1em',
    height: '1em'
  }
})

function SelectMultipleValue({
  disabled,
  onClear,
  children
}: React.PropsWithChildren<Props>) {
  const { className } = stylex.props(styles.icon)
  const classes = useClasses('clear-icon', className)

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    onClear?.()
  }

  return (
    <div {...stylex.props(styles.item, disabled && styles.disabled)}>
      {children}
      {!!onClear && (
        <div
          role="presentation"
          onClick={handleClick}
          className={classes}
        >
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            shapeRendering="geometricPrecision"
            {...stylex.props(styles.svg)}
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </div>
      )}
    </div>
  )
}

SelectMultipleValue.displayName = 'SelectMultipleValue'
export { SelectMultipleValue }
