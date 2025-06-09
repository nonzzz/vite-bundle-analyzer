import { useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LayoutModule } from 'squarified'
import PhAppWindow from '~icons/ph/app-window'
import PhBoundingBox from '~icons/ph/bounding-box'
import PhX from '~icons/ph/x'
import { withScale } from '../../composables'
export type MenuAction = 'zoom' | 'reset' | 'details' | 'close'
export type MenuActionHandler = (action: MenuAction, module: LayoutModule | null) => void

export interface MenuProps {
  x: number
  y: number
  container: HTMLElement | null
  currentModule: LayoutModule
  onAction: MenuActionHandler
  canvasContext: CanvasRenderingContext2D | null
}

const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
)

const menuItems = [
  { action: 'zoom' as const, label: 'Zoom', icon: PhBoundingBox },
  { action: 'reset' as const, label: 'Reset', icon: ResetIcon },
  { action: 'details' as const, label: 'Show Details', icon: PhAppWindow },
  { action: 'close' as const, label: 'Close', icon: PhX }
]

interface MenuItemProps {
  icon: React.ComponentType
  label: string
  onClick: () => void
}

const MenuItem = ({ icon: Icon, label, onClick }: MenuItemProps) => (
  <div
    onClick={onClick}
    stylex={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#f5f5f5'
      }
    }}
  >
    <Icon />
    <span>{label}</span>
  </div>
)

const MENU_WIDTH = 160
const MENU_HEIGHT = 32 * menuItems.length
const MENU_OFFSET = 8

function calculateMenuPosition(
  rawX: number,
  rawY: number,
  canvasContext: CanvasRenderingContext2D | null
) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  let menuX = rawX + MENU_OFFSET
  let menuY = rawY + MENU_OFFSET

  if (menuX + MENU_WIDTH > viewport.width) {
    menuX = rawX - MENU_WIDTH - MENU_OFFSET
  }

  if (menuY + MENU_HEIGHT > viewport.height) {
    // 如果超出下边界，显示在鼠标上方
    menuY = rawY - MENU_HEIGHT - MENU_OFFSET
  }

  if (canvasContext) {
    const canvas = canvasContext.canvas
    const canvasBounds = canvas.getBoundingClientRect()

    if (menuX + MENU_WIDTH > canvasBounds.right) {
      menuX = Math.min(rawX - MENU_WIDTH - MENU_OFFSET, canvasBounds.right - MENU_WIDTH - MENU_OFFSET)
    }

    if (menuY + MENU_HEIGHT > canvasBounds.bottom) {
      menuY = Math.min(rawY - MENU_HEIGHT - MENU_OFFSET, canvasBounds.bottom - MENU_HEIGHT - MENU_OFFSET)
    }

    menuX = Math.max(menuX, canvasBounds.left + MENU_OFFSET)

    menuY = Math.max(menuY, canvasBounds.top + MENU_OFFSET)
  }

  menuX = Math.max(MENU_OFFSET, Math.min(menuX, viewport.width - MENU_WIDTH - MENU_OFFSET))
  menuY = Math.max(MENU_OFFSET, Math.min(menuY, viewport.height - MENU_HEIGHT - MENU_OFFSET))

  return { x: menuX, y: menuY }
}
function MenuComponent({
  x,
  y,
  currentModule,
  container,
  onAction,
  canvasContext
}: MenuProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  const adjustedPosition = useMemo(() => {
    return calculateMenuPosition(x, y, canvasContext)
  }, [x, y, canvasContext])

  useLayoutEffect(() => {
    if (container) {
      setPortalContainer(container)
    }
  }, [container])

  if (!portalContainer) {
    return null
  }

  return createPortal(
    <div
      className="context-menu"
      stylex={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 9999,
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        minWidth: `${MENU_WIDTH}px`,
        overflow: 'hidden'
      }}
    >
      {menuItems.map(({ action, label, icon }) => (
        <MenuItem
          key={action}
          icon={icon}
          label={label}
          onClick={() => onAction(action, currentModule)}
        />
      ))}
    </div>,
    portalContainer
  )
}

export const Menu = withScale(MenuComponent)
