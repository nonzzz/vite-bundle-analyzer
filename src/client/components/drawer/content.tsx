import React from 'react'
import * as stylex from '@stylexjs/stylex'
import { useScale, withScale } from '../../composables'
import type { SCALES } from '../../composables'

interface Props {}

const styles = stylex.create({
  content: {
    position: 'relative',
    textAlign: 'left'
  },
  layout: (scale: SCALES) => ({
    fontSize: scale.font(1),
    width: scale.width(1, 'auto'),
    height: scale.height(1, 'auto'),
    padding: `${scale.pt(1.3125)} ${scale.pr(1.3125)} ${scale.pb(1.3125)} ${scale.pl(1.3125)}`
  })
})

function DrawerContentComponent(props: React.PropsWithChildren<Props>) {
  const { SCALES } = useScale()
  const { children, ...rest } = props

  return (
    <div {...stylex.props(styles.content, styles.layout(SCALES))} {...rest}>
      {children}
    </div>
  )
}

DrawerContentComponent.displayName = 'DrawerContent'

export const DrawerContent = withScale(DrawerContentComponent)
