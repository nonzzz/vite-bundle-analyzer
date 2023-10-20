import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Sizes } from './interface'
import { noop } from './shared'

export interface ApplicationConfig {
  sizes: Sizes
  scence: Set<string>
  foamModule: typeof window.foamModule
  drawerVisible: boolean
  updateSizes: Dispatch<SetStateAction<ApplicationConfig['sizes']>>
  updateScence: Dispatch<SetStateAction<ApplicationConfig['scence']>>
  updateDrawerVisible: Dispatch<SetStateAction<ApplicationConfig['drawerVisible']>>
}

export const SIZE_RECORD: Record<typeof window['defaultSizes'], Sizes> = {
  stat: 'statSize',
  gzip: 'gzipSize',
  parsed: 'parsedSize'
}

const defaultApplicationContext = <ApplicationConfig>{
  sizes: SIZE_RECORD.stat,
  foamModule: [],
  drawerVisible: false,
  scence: new Set(),
  updateSizes: noop,
  updateScence: noop,
  updateDrawerVisible: noop
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
