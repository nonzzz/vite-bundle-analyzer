import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Sizes } from './interface'
import { noop } from './shared'

export interface ApplicationConfig {
    sizes: Sizes
    foamModule: typeof window.foamModule
    updateSizes: Dispatch<SetStateAction<ApplicationConfig['sizes']>>
}

export const SIZE_RECORD: Record<typeof window['defaultSizes'], Sizes> = {
  stat: 'statSize',
  gzip: 'gzipSize',
  parsed: 'parsedSize'
}

const defaultApplicationContext = <ApplicationConfig>{
  sizes: SIZE_RECORD.stat,
  foamModule: [],
  updateSizes: noop
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
