import { RefObject, useCallback, useRef, useState } from 'react'
import { Text } from '@geist-ui/core'
import stylex from '@stylexjs/stylex'
import { FoamDataObject } from '@carrotsearch/foamtree'
import { ModuleSize, TreeMap, TreeMapComponent } from './components/tree-map'
import { ApplicationContext, SIZE_RECORD } from './context'
import type { ApplicationConfig } from './context'
import { Spacer } from './components/spacer'
import './init.css'
import { Sidebar, SidebarProvider } from './components/side-bar'
import type { ModeType } from './components/side-bar/side-bar'
import { Tooltip } from './components/tooltip'

const styles = stylex.create({
  app: {
    height: '100%',
    width: '100%',
    position: 'relative'
  }
})

export function App() {
  const treeMapRef = useRef<TreeMapComponent>()
  const [sizes, setSizes] = useState<ApplicationConfig['sizes']>(SIZE_RECORD[window.defaultSizes])
  const [foamModule] = useState<ApplicationConfig['foamModule']>(() => window.foamModule)
  const [scence, setScence] = useState<Set<string>>(new Set())
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<FoamDataObject | null>(null)
  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const initialValue = {
    sizes,
    scence,
    foamModule,
    updateScence: setScence,
    treemap: treeMapRef as RefObject<TreeMapComponent>
  }

  const handleModeChange = (kind: ModeType) => {
    setSizes(() => kind === 'Gzipped' ? 'gzipSize' : kind === 'Stat' ? 'statSize' : 'parsedSize')
  }

  const handleGroupHover = useCallback((group: FoamDataObject | null) => {
    setTooltipVisible(!!group)
    setTooltipContent(() => group ? group : null)
  }, [])

  return (
    <ApplicationContext.Provider
      value={initialValue}
    >
      <div {...stylex.props(styles.app)}>
        <SidebarProvider>
          <Sidebar foamModule={foamModule} mode={sizes} onModeChange={handleModeChange} onVisibleChange={(s) => setTooltipVisible(!s)} />
        </SidebarProvider>
        <TreeMap ref={(instance: any) => treeMapRef.current = instance} onGroupHover={handleGroupHover} />
        <Tooltip visible={tooltipVisible}>
          {tooltipContent && (
            <>
              <Text p b font="14px">{tooltipContent.label}</Text>
              <Spacer h={0.5} />
              <ModuleSize module={tooltipContent} sizes="statSize" checkedSizes={sizes} />
              <ModuleSize module={tooltipContent} sizes="parsedSize" checkedSizes={sizes} />
              <ModuleSize module={tooltipContent} sizes="gzipSize" checkedSizes={sizes} />
              <Text p font="12px">
                path:
                {' '}
                {tooltipContent.id}
              </Text>
            </>
          )}
        </Tooltip>
      </div>
    </ApplicationContext.Provider>
  )
}
