import { createContextState } from 'foxact/create-context-state'
import { useCallback } from 'react'

export interface SidebarStateContext {
  drawerVisibile: boolean
}

export const initialValue: SidebarStateContext = {
  drawerVisibile: false
}

const [SidebarProvider, useSidebarState, useSetSidebarState] = createContextState<SidebarStateContext>(initialValue)

export { SidebarProvider, useSetSidebarState, useSidebarState }

export function useToggleDrawerVisible() {
  const dispatch = useSetSidebarState()
  return useCallback(() => dispatch(pre => ({ ...pre, drawerVisibile: !pre.drawerVisibile })), [dispatch])
}
