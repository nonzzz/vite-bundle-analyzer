import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScroll, withScale } from '@geist-ui/core'
import usePortal from '@geist-ui/core/esm/utils/use-portal'
import Backdrop from '@geist-ui/core/esm/shared/backdrop'
import { DrawerWrapper } from './wrapper'

interface Props {
  visible?: boolean
  disableBackdropClick?: boolean
  onClose?: () => void
  onContentClick?: (event: React. MouseEvent<HTMLElement>) => void
}

export type DrawerProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

function DrawerComponent(props: DrawerProps) {
  const { visible: userVisible, disableBackdropClick = false, children, onClose, ...rest } = props
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
    if (disableBackdropClick) return
    closeDrawer()
  }
  if (!portal) return null
  return createPortal(
    <Backdrop onClick={closeFromBackdrop} visible={visible} width="100%">
      <DrawerWrapper visible={visible} {...rest}>{children}</DrawerWrapper>
    </Backdrop>, portal)
}

DrawerComponent.displayName = 'Drawer'

export const Drawer = withScale(DrawerComponent)
