import React, { useMemo } from 'react'
import * as stylex from '@stylexjs/stylex'
import { useClasses, useScale } from '../../composables'
import type { SCALES } from '../../composables'

export interface Props {
  tag: keyof JSX.IntrinsicElements
  className?: string
}

const defaultProps = {
  className: ''
}

type NativeAttrs = Omit<React.DetailsHTMLAttributes<any>, keyof Props>
export type TextChildProps = Props & NativeAttrs

const styles = stylex.create({
  tag: (scale: SCALES) => ({
    width: scale.width(1, 'auto'),
    height: scale.height(1, 'auto'),
    ':not(#__unused__).font': {
      fontSize: scale.font(1, 'inherit')
    },
    ':not(#__unused__).mx': {
      marginLeft: scale.ml(0, 'revert'),
      marginRight: scale.mr(0, 'revert')
    },
    ':not(#__unused__).my': {
      marginTop: scale.mt(0, 'revert'),
      marginBottom: scale.mb(0, 'revert')
    },
    ':not(#__unused__).px': {
      paddingLeft: scale.pl(0, 'revert'),
      paddingRight: scale.pr(0, 'revert')
    },
    ':not(#__unused__).py': {
      paddingTop: scale.pt(0, 'revert'),
      paddingBottom: scale.pb(0, 'revert')
    }
  })
})

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

  const { className, style } = stylex.props(styles.tag(SCALES))

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
