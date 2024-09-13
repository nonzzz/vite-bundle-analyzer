import { createContext, useCallback, useContext } from 'react'
import type { RefObject } from 'react'
import { noop } from 'foxact/noop'
import { createContextState } from 'foxact/context-state'
import type { Sizes } from './interface'
import { TreeMapComponent } from './components/treemap'

export interface ApplicationConfig {
  sizes: Sizes
  analyzeModule: typeof window.analyzeModule
  scence: Set<string>
}

export interface TreemapConfig {
  treemap: RefObject<TreeMapComponent>
}

export const SIZE_RECORD: Record<typeof window['defaultSizes'], Sizes> = {
  stat: 'statSize',
  gzip: 'gzipSize',
  parsed: 'parsedSize'
}

const defaultApplicationContext = <ApplicationConfig> {
  sizes:window.isCacheLastSiezMode ? sessionStorage.getItem('currentSizeMode') || SIZE_RECORD[window.defaultSizes] : SIZE_RECORD[window.defaultSizes] ,
  analyzeModule: window.analyzeModule,
  scence: new Set(),
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
  return useCallback((scence: Set<string>) => dispatch(pre => ({ ...pre, scence })), [dispatch])
}

export function useToggleSize() {
  const dispatch = useSetApplicationContext()
  return useCallback((sizes: Sizes) => dispatch(pre => ({ ...pre, sizes })), [dispatch])
}

const TreemapContext = createContext(defaultTreemapContext)
export const TreemapProvider = TreemapContext.Provider
export const useTreemapContext = () => useContext(TreemapContext)

export { ApplicationProvider, useApplicationContext }
