import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LayoutModule } from 'squarified'
import { withScale } from '../../composables'

export type MenuAction = 'zoom' | 'reset' | 'details' | 'close'
export type MenuActionHandler = (action: MenuAction, module: LayoutModule) => void

export interface MenuProps {
  x: number
  y: number
  container: HTMLElement | null
  currentModule: LayoutModule
  onAction: MenuActionHandler
}

function MenuComponent({ x, y, currentModule, container, onAction }: MenuProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (container) {
      setPortalContainer(container)
    }
  }, [container])

  const handleAction = (action: MenuAction, mod: LayoutModule) => {
    onAction(action, mod)
  }

  if (!portalContainer) {
    return null
  }

  return createPortal(
    <div
      className="context-menu"
      stylex={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        backgroundColor: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        borderRadius: '4px',
        padding: '8px 0'
      }}
    >
      <div
        onClick={() => handleAction('zoom', currentModule)}
        stylex={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Zoom
      </div>
      <div
        onClick={() => handleAction('reset', currentModule)}
        stylex={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Reset
      </div>
      <div
        onClick={() => handleAction('details', currentModule)}
        stylex={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Show Details
      </div>
      <div
        onClick={() => handleAction('close', currentModule)}
        stylex={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Close
      </div>
    </div>,
    portalContainer
  )
}

export const Menu = withScale(MenuComponent)
