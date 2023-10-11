import React, { useState } from 'react'
import style9 from 'style9'
import { GeistProvider } from '@geist-ui/core'
import { SideBar } from './components/side-bar'
import { TreeMap } from './components/tree-map'
import { ApplicationContext } from './context'
import type { ApplicationConfig } from './context'
import './init.css'

const styles = style9.create({
  app: {
    height: '100%',
    width: '100%',
    position: 'relative'
  }
})

export function App() {
  const [defaultSizes] = useState<ApplicationConfig['defaultSizes']>(window.defaultSizes)
  const [prettyModule] = useState<ApplicationConfig['prettyModule']>(() => window.prettyModule)

  return <GeistProvider>
    <ApplicationContext.Provider value={{ defaultSizes, prettyModule }}>
      <div className={styles('app')}>
        <SideBar />
        <TreeMap />
      </div>
    </ApplicationContext.Provider>
  </GeistProvider>
}
