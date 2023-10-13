import { createContext, useContext } from 'react'

export interface ApplicationConfig {
    defaultSizes: typeof window.defaultSizes
    foamModule: typeof window.foamModule
}

const defaultApplicationContext = <ApplicationConfig>{
  defaultSizes: 'stat',
  foamModule: []
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
