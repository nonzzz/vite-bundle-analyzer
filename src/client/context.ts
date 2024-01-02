import { RefObject, createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { noop } from 'foxact/noop'
import type { Sizes } from './interface'
import { TreeMapComponent } from './components/tree-map'

export interface ApplicationConfig {
  sizes: Sizes
  scence: Set<string>
  foamModule: typeof window.foamModule
  updateScence: Dispatch<SetStateAction<ApplicationConfig['scence']>>
  treemap: RefObject<TreeMapComponent>
}

export const SIZE_RECORD: Record<typeof window['defaultSizes'], Sizes> = {
  stat: 'statSize',
  gzip: 'gzipSize',
  parsed: 'parsedSize'
}

const defaultApplicationContext = <ApplicationConfig>{
  sizes: SIZE_RECORD.stat,
  foamModule: [],
  scence: new Set(),
  updateScence: noop,
  treemap: { current: null }
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
