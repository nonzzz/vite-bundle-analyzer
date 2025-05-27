import React, { useEffect, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScroll, usePortal, useScale, withScale } from '../../composables'
import { Backdrop } from '../drawer/backdrop'
import { ModalWrapper } from './wrapper'

interface Props {
  visible?: boolean
  keyboard?: boolean
  disableBackdropClick?: boolean
  onClose?: () => void
}

type NativeAttrs = Omit<React.HTMLAttributes<Any>, keyof Props>
export type ModalProps = Props & NativeAttrs

interface ModalState {
  visible: boolean
}

type ModalComponentAction =
  | { type: 'SYNC_WITH_PROPS', payload: boolean }
  | { type: 'CLOSE' }

function modalReducer(state: ModalState, action: ModalComponentAction): ModalState {
  switch (action.type) {
    case 'SYNC_WITH_PROPS':
      return { ...state, visible: action.payload }
    case 'CLOSE':
      return { ...state, visible: false }
    default:
      return state
  }
}

function ModalComponent(props: React.PropsWithChildren<ModalProps>) {
  const portal = usePortal('modal')
  const { disableBackdropClick, children, visible: userVisible = false, onClose } = props

  const [, setBodyHidden] = useBodyScroll({ delayReset: 300 })

  const [state, dispatch] = useReducer(modalReducer, {
    visible: userVisible
  })

  const { SCALES } = useScale()

  useEffect(() => {
    if (typeof userVisible !== 'undefined' && userVisible !== state.visible) {
      dispatch({ type: 'SYNC_WITH_PROPS', payload: userVisible })
      setBodyHidden(userVisible)
    }
  }, [userVisible, state.visible, setBodyHidden])

  const closeModal = () => {
    onClose?.()
    dispatch({ type: 'CLOSE' })
    setBodyHidden(false)
  }

  const closeFromBackdrop = () => {
    if (disableBackdropClick) {
      return
    }
    closeModal()
  }

  if (!portal) {
    return null
  }

  return createPortal(
    <Backdrop width={SCALES.width(26)} visible={state.visible} onClick={closeFromBackdrop}>
      <ModalWrapper visible={state.visible}>
        {children}
      </ModalWrapper>
    </Backdrop>,
    portal
  )
}

export const Modal = withScale(ModalComponent)
