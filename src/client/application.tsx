import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { ComposeContextProvider } from 'foxact/compose-context-provider'
import type { FoamDataObject } from '@carrotsearch/foamtree'
import { Tooltip } from './components/tooltip'
import { Text } from './components/text'
import { Spacer } from './components/spacer'
import { ApplicationProvider, TreemapProvider, useApplicationContext } from './context'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { Treemap } from './components/treemap'
import type { TreemapInstance } from './components/treemap'

// import { ModuleSize, TreeMap } from './components/tree-map'

export function App() {
  const treeMapRef = useRef<TreemapInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<FoamDataObject | null>(null)

  const contexts = [
    <ApplicationProvider key="app" />,
    <TreemapProvider key="treemap" value={{ treemap: treeMapRef as RefObject<TreemapInstance> }} />
  ]

  const handleGroupHover = useCallback((group: FoamDataObject | null) => {
    setTooltipVisible(!!group)
    setTooltipContent(() => group ? group : null)
  }, [])

  const { sizes } = useApplicationContext()

  return (
    <ComposeContextProvider contexts={contexts}>
      <div
        stylex={{
          height: '100%',
          width: '100%',
          position: 'relative'
        }}
      >
        <SidebarProvider>
          <Sidebar onVisibleChange={(s) => setTooltipVisible(!s)} />
        </SidebarProvider>
        <Treemap ref={(instance: any) => treeMapRef.current = instance} />
        {/* <TreeMap ref={(instance: any) => treeMapRef.current = instance} onGroupHover={handleGroupHover} /> */}
        <Tooltip visible={tooltipVisible}>
          {tooltipContent && (
            <>
              <Text p b font="14px">{tooltipContent.label}</Text>
              <Spacer h={0.5} />
              {/* <ModuleSize module={tooltipContent} sizes="statSize" checkedSizes={sizes} /> */}
              {/* <ModuleSize module={tooltipContent} sizes="parsedSize" checkedSizes={sizes} /> */}
              {/* <ModuleSize module={tooltipContent} sizes="gzipSize" checkedSizes={sizes} /> */}
              <Text p font="12px">
                path: 
                {' '}
                {tooltipContent.filename}
              </Text>
            </>
          )}
        </Tooltip>
      </div>
    </ComposeContextProvider>
  )
}
