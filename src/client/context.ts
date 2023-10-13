import { createContext, useContext } from 'react'

export interface ApplicationConfig {
    defaultSizes: typeof window.defaultSizes
    foramModule: typeof window.foramModule
}

const defaultApplicationContext = <ApplicationConfig>{
  defaultSizes: 'stat',
  foramModule: []
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
