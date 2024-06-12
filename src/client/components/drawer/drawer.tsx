import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScroll, usePortal, withScale } from '../../composables'
import { Backdrop } from './backdrop'
import { DrawerWrapper } from './wrapper'

interface Props {
  visible?: boolean
  onClose?: () => void
  onContentClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export type DrawerProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

function DrawerComponent(props: DrawerProps) {
  const { visible: userVisible, children, onClose, ...rest } = props
  const portal = usePortal('drawer')
  const [visible, setVisible] = useState<boolean>(false)
  const [, setBodyHidden] = useBodyScroll(null, { delayReset: 300 })

  const closeDrawer = () => {
    onClose?.()
    setVisible(false)
    setBodyHidden(false)
  }

  useEffect(() => {
    if (typeof userVisible === 'undefined') return
    setVisible(userVisible)
    setBodyHidden(userVisible)
  }, [setBodyHidden, userVisible])

  const closeFromBackdrop = () => {
    closeDrawer()
  }
  if (!portal) return null
  return createPortal(
    <Backdrop onClick={closeFromBackdrop} visible={visible} width="100%">
      <DrawerWrapper visible={visible} {...rest}>{children}</DrawerWrapper>
    </Backdrop>,
    portal
  )
}

DrawerComponent.displayName = 'Drawer'

export const Drawer = withScale(DrawerComponent)
