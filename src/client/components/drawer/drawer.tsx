import React, { useEffect, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScroll, usePortal, withScale } from '../../composables'
import { Backdrop } from './backdrop'
import { DrawerWrapper } from './wrapper'

interface Props {
  visible?: boolean
  onClose?: () => void
  onContentClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export type DrawerProps = Omit<React.HTMLAttributes<unknown>, keyof Props> & Props

interface DrawerState {
  visible: boolean
}

type DrawerComponentAction =
  | { type: 'SYNC_WITH_PROPS', payload: boolean }
  | { type: 'CLOSE' }

function drawerReducer(state: DrawerState, action: DrawerComponentAction): DrawerState {
  switch (action.type) {
    case 'SYNC_WITH_PROPS':
      return { ...state, visible: action.payload }
    case 'CLOSE':
      return { ...state, visible: false }
    default:
      return state
  }
}

function DrawerComponent(props: DrawerProps) {
  const { visible: userVisible = false, children, onClose, ...rest } = props
  const portal = usePortal('drawer')
  const [, setBodyHidden] = useBodyScroll({ delayReset: 300 })
  const [state, dispatch] = useReducer(drawerReducer, {
    visible: userVisible
  })

  useEffect(() => {
    if (typeof userVisible !== 'undefined' && userVisible !== state.visible) {
      dispatch({ type: 'SYNC_WITH_PROPS', payload: userVisible })
      setBodyHidden(userVisible)
    }
  }, [userVisible, state.visible, setBodyHidden])

  const closeDrawer = () => {
    onClose?.()
    dispatch({ type: 'CLOSE' })
    setBodyHidden(false)
  }

  const closeFromBackdrop = () => {
    closeDrawer()
  }
  if (!portal) { return null }
  return createPortal(
    <Backdrop onClick={closeFromBackdrop} visible={state.visible} width="100%">
      <DrawerWrapper visible={state.visible} {...rest}>{children}</DrawerWrapper>
    </Backdrop>,
    portal
  )
}

export const Drawer = withScale(DrawerComponent)
