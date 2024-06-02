import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { ComposeContextProvider } from 'foxact/compose-context-provider'
import { Tooltip } from './components/tooltip'
import { Text } from './components/text'
import { Spacer } from './components/spacer'
import { ApplicationProvider, TreemapProvider } from './context'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { Treemap } from './components/treemap'
import type { PaintEvent, SquarifiedModule, TreemapInstance } from './components/treemap'
import { convertBytes } from './shared'

interface ModuleSizeProps {
  module: SquarifiedModule
}

function ModuleSize(props: ModuleSizeProps) {
  const { module: { node } } = props
  if (!node) return null

  return (
    <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
      <Text b p font="14px" mr={0.3}>Size:</Text>
      <Text font="14px">{convertBytes(node.size)}</Text>
    </div>
  )
}

export function App() {
  const treeMapRef = useRef<TreemapInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<SquarifiedModule | null>(Object.create(null))

  const contexts = [
    <ApplicationProvider key="app" />,
    <TreemapProvider key="treemap" value={{ treemap: treeMapRef as RefObject<TreemapInstance> }} />
  ]

  const handleMousemove = useCallback((event: PaintEvent<MouseEvent>) => {
    const { module } = event
    setTooltipVisible(!!module)
    setTooltipContent(() => module)
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
        <Treemap ref={(instance: any) => treeMapRef.current = instance} onMousemove={handleMousemove} />
        <Tooltip visible={tooltipVisible}>
          {tooltipContent?.node && (
            <>
              <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
                <Text b font="14px" mr={0.3}>Id:</Text>
                <Text font="14px">
                  {tooltipContent.node.label}
                </Text>
              </div>
              <Spacer h={0.5} />
              <ModuleSize module={tooltipContent} />
              <Spacer h={0.5} />
              <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
                <Text b font="14px" mr={0.3}>Path:</Text>
                <Text font="14px">
                  {tooltipContent.node.filename}
                </Text>
              </div>
            </>
          )}
        </Tooltip>
      </div>
    </ComposeContextProvider>
  )
}
