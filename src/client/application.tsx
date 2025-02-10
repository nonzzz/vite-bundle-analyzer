import { ComposeContextProvider } from 'foxact/compose-context-provider'
import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { NativeModule, PrimitiveEventMetadata } from 'squarified'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { Spacer } from './components/spacer'
import { Text } from './components/text'
import { Tooltip } from './components/tooltip'
import { Treemap } from './components/treemap'
import type { TreemapComponentInstance } from './components/treemap'
import { ApplicationProvider, TreemapProvider } from './context'
import { convertBytes } from './shared'
import './css-baseline'
import 'virtual:stylex.css'
import { Receiver } from './receiver'

interface ModuleSizeProps {
  module: NativeModule
}

function ModuleSize(props: ModuleSizeProps) {
  const { module } = props
  if (!module) { return null }

  return (
    <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
      <Text b p font="14px" mr={0.3}>Size:</Text>
      <Text font="14px">{convertBytes(module.weight)}</Text>
    </div>
  )
}

export function App() {
  const treeMapRef = useRef<TreemapComponentInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<NativeModule & { filename: string, label: string } | null>(null)

  const contexts = [
    <ApplicationProvider key="app" />,
    <TreemapProvider key="treemap" value={{ treemap: treeMapRef as RefObject<TreemapComponentInstance> }} />
  ]

  const handleMousemove = useCallback((data: PrimitiveEventMetadata<'mousemove'>) => {
    setTooltipVisible(!!data.module)
    if (data.module) {
      // @ts-expect-error safe
      setTooltipContent(() => data.module.node)
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
        <Receiver />
        <SidebarProvider>
          <Sidebar onVisibleChange={(s) => setTooltipVisible(!s)} />
        </SidebarProvider>
        <Treemap ref={(instance: TreemapComponentInstance) => treeMapRef.current = instance} onMousemove={handleMousemove} />
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
