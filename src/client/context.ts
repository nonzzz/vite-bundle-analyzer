import { createContextState } from 'foxact/context-state'
import { noop } from 'foxact/noop'
import { createContext, useCallback, useContext } from 'react'
import type { RefObject } from 'react'
import type { TreemapComponentInstance } from './components/treemap'
import type { Module, Sizes } from './interface'
import type { SendUIMessage } from './special'

export interface UI {
  SideBar: SendUIMessage['Component'] | null
  Main: SendUIMessage['Component'] | null
}
export interface ApplicationConfig {
  sizes: Sizes
  analyzeModule: Module[]
  scence: Set<string>
  ui: UI
}

export interface TreemapConfig {
  treemap: RefObject<TreemapComponentInstance>
}

export const SIZE_RECORD: Record<typeof window['defaultSizes'], Sizes> = {
  stat: 'statSize',
  gzip: 'gzipSize',
  parsed: 'parsedSize',
  brotli: 'brotliSize'
}

const defaultApplicationContext = <ApplicationConfig> {
  sizes: SIZE_RECORD[window.defaultSizes],
  analyzeModule: window.analyzeModule,
  scence: new Set(),
  ui: { Main: null, SideBar: null },
  updateScence: noop
}

const defaultTreemapContext = <TreemapConfig> {
  treemap: { current: null }
}

const [ApplicationProvider, useApplicationContext, useSetApplicationContext] = createContextState<ApplicationConfig>(
  defaultApplicationContext
)

export function useUpdateScence() {
  const dispatch = useSetApplicationContext()
  return useCallback((scence: Set<string>) => dispatch((pre) => ({ ...pre, scence })), [dispatch])
}

export function useToggleSize() {
  const dispatch = useSetApplicationContext()
  return useCallback((sizes: Sizes) => dispatch((pre) => ({ ...pre, sizes })), [dispatch])
}

export function useUpdateUI() {
  const dispatch = useSetApplicationContext()
  return useCallback(
    (type: 'SideBar' | 'Main', element: SendUIMessage['Component'] | null) =>
      dispatch((pre) => ({ ...pre, ui: { ...pre.ui, [type]: element } })),
    [dispatch]
  )
}

export function useUpdateAnalyzeModule() {
  const dispatch = useSetApplicationContext()
  return useCallback((modules: Module[]) => dispatch((pre) => ({ ...pre, analyzeModule: modules })), [dispatch])
}

const TreemapContext = createContext(defaultTreemapContext)
export const TreemapProvider = TreemapContext.Provider
export const useTreemapContext = () => useContext(TreemapContext)

export { ApplicationProvider, useApplicationContext }
