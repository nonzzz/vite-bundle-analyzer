import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useScale, withScale } from '../../composables'
import { SCALES } from '../../composables'
 
interface Props {
  inline?: boolean
}

const defaultProps: Props = {
  inline: false
}

export type SpacerProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

const styles = stylex.create({
  inline: {
    display: 'inline-block'
  },
  block: {
    display: 'block'
  },
  spacer: (scale: SCALES) => ({
    width: scale.width(1),
    height: scale.height(1),
    padding: `${scale.pt(0)} ${scale.pr(0)} ${scale.pb(0)} ${scale.pl(0)}`,
    margin: `${scale.mt(0)} ${scale.mr(0)} ${scale.mb(0)} ${scale.ml(0)}`
  })
})

function SpacerComponent({ inline, ...props }: SpacerProps) {
  const { SCALES } = useScale()
  return <div {...stylex.props(styles.spacer(SCALES), inline ? styles.inline : styles.block)} {...props} />
}

SpacerComponent.defaultProps = defaultProps
SpacerComponent.displayName = 'Spacer'

export const Spacer = withScale(SpacerComponent)
