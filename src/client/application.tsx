import { useState } from 'react'
import style9 from 'style9'
import { GeistProvider } from '@geist-ui/core'
import { SideBar } from './components/side-bar'
import { TreeMap } from './components/tree-map'
import { ApplicationContext, SIZE_RECORD } from './context'
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
  const [sizes, setSizes] = useState<ApplicationConfig['sizes']>(SIZE_RECORD[window.defaultSizes])
  const [foamModule] = useState<ApplicationConfig['foamModule']>(() => window.foamModule)
  const [scence, setScence] = useState<Set<string>>(new Set())
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const initialValue = { sizes, scence, foamModule, drawerVisible, updateSizes: setSizes, updateScence: setScence, updateDrawerVisible: setDrawerVisible }

  return (
    <GeistProvider>
      <ApplicationContext.Provider 
        value={initialValue}
      >
        <div className={styles('app')}>
          <SideBar />
          <TreeMap />
        </div>
      </ApplicationContext.Provider>
    </GeistProvider>
  )
}
