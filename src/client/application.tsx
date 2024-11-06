import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { ComposeContextProvider } from 'foxact/compose-context-provider'
import { Tooltip } from './components/tooltip'
import { Text } from './components/text'
import { Spacer } from './components/spacer'
import { ApplicationProvider, TreemapProvider } from './context'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { TreemapV2 } from './components/treemap-v2'
import type { TreeMapComponent } from './components/treemap'
import { convertBytes } from './shared'
import './css-baseline'
import 'virtual:stylex.css'

interface ModuleSizeProps {
  module: any
}

function ModuleSize(props: ModuleSizeProps) {
  const { module } = props
  if (!module) return null

  return (
    <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
      <Text b p font="14px" mr={0.3}>Size:</Text>
      <Text font="14px">{convertBytes(module.weight)}</Text>
    </div>
  )
}

export function App() {
  const treeMapRef = useRef<TreeMapComponent>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<any | null>(Object.create(null))

  const contexts = [
    <ApplicationProvider key="app" />,
    <TreemapProvider key="treemap" value={{ treemap: treeMapRef as RefObject<TreeMapComponent> }} />
  ]

  const handleMousemove = useCallback((data: any) => {
    setTooltipVisible(!!data.module)
    if (data.module) {
      setTooltipContent(() => data.module.node as Module)
    }
  }, [])

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
        <TreemapV2 ref={(instance: any) => treeMapRef.current = instance} onMousemove={handleMousemove} />
        <Tooltip visible={tooltipVisible}>
          {tooltipContent && (
            <>
              <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
                <Text b font="14px" mr={0.3}>Id:</Text>
                <Text font="14px">
                  {tooltipContent.label}
                </Text>
              </div>
              <Spacer h={0.5} />
              <ModuleSize module={tooltipContent} />
              <Spacer h={0.5} />
              <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
                <Text b font="14px" mr={0.3}>Path:</Text>
                <Text font="14px">
                  {tooltipContent.filename}
                </Text>
              </div>
            </>
          )}
        </Tooltip>
      </div>
    </ComposeContextProvider>
  )
}
