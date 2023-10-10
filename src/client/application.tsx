import React from 'react'
import style9 from 'style9'
import { GeistProvider } from '@geist-ui/core'
import { SideBar } from './components/side-bar'
import { TreeMap } from './components/tree-map'

const styles = style9.create({
  app: {
    height: '100%',
    width: '100%',
    position: 'relative'
  }
})

export function App() {
  return <GeistProvider>
    <div className={styles('app')}>
      <SideBar />
      <TreeMap />
    </div>
  </GeistProvider>
}
