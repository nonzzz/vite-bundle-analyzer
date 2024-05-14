import React, { useMemo } from 'react'
import * as stylex from '@stylexjs/stylex'
import { inline } from '@stylex-extend/core'
import { useClasses, useScale } from '../../composables'

export interface Props {
  tag: keyof JSX.IntrinsicElements
  className?: string
}

const defaultProps = {
  className: ''
}

type NativeAttrs = Omit<React.DetailsHTMLAttributes<any>, keyof Props>
export type TextChildProps = Props & NativeAttrs

function TextChild({
  children,
  tag,
  className: userClassName,
  ...props
}: React.PropsWithChildren<TextChildProps>) {
  const Component = tag
  const { SCALES, getScaleProps } = useScale()
  const font = getScaleProps('font')
  const mx = getScaleProps(['margin', 'marginLeft', 'marginRight', 'mx', 'ml', 'mr'])
  const my = getScaleProps(['margin', 'marginTop', 'marginBottom', 'my', 'mt', 'mb'])
  const px = getScaleProps(['padding', 'paddingLeft', 'paddingRight', 'pl', 'pr', 'px'])
  const py = getScaleProps(['padding', 'paddingTop', 'paddingBottom', 'pt', 'pb', 'py'])
  const classNames = useMemo<string>(() => {
    const keys = [
      { value: mx, className: 'mx' },
      { value: my, className: 'my' },
      { value: px, className: 'px' },
      { value: py, className: 'py' },
      { value: font, className: 'font' }
    ]
    const scaleClassNames = keys.reduce((pre, next) => {
      if (typeof next.value === 'undefined') return pre
      return `${pre} ${next.className}`
    }, '')
    return `${scaleClassNames} ${userClassName}`.trim()
  }, [mx, my, px, py, font, userClassName])

  const { className, style } = stylex.props(inline({
    width: SCALES.width(1, 'auto'),
    height: SCALES.height(1, 'auto'),
    ':not(#__unused__).font': {
      fontSize: SCALES.font(1, 'inherit')
    },
    ':not(#__unused__).mx': {
      marginLeft: SCALES.ml(0, 'revert'),
      marginRight: SCALES.mr(0, 'revert')
    },
    ':not(#__unused__).my': {
      marginTop: SCALES.mt(0, 'revert'),
      marginBottom: SCALES.mb(0, 'revert')
    },
    ':not(#__unused__).px': {
      paddingLeft: SCALES.pl(0, 'revert'),
      paddingRight: SCALES.pr(0, 'revert')
    },
    ':not(#__unused__).py': {
      paddingTop: SCALES.pt(0, 'revert'),
      paddingBottom: SCALES.pb(0, 'revert')
    }
  }))

  const classes = useClasses(className, classNames)

  return (
    // @ts-expect-error
    <Component className={classes} style={style} {...props}>
      {children}
    </Component>
  )
}

TextChild.defaultProps = defaultProps
TextChild.displayName = 'TextChild'

export { TextChild }
