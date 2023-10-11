import { createContext, useContext } from 'react'

export interface ApplicationConfig {
    defaultSizes: typeof window.defaultSizes
    prettyModule: typeof window.prettyModule
}

const defaultApplicationContext = <ApplicationConfig>{
  defaultSizes: 'stat',
  prettyModule: []
}

export const ApplicationContext = createContext<ApplicationConfig>(defaultApplicationContext)

export function useApplicationContext() {
  return useContext<ApplicationConfig>(ApplicationContext)
}
