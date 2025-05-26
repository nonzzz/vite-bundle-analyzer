import { ComposeContextProvider } from 'foxact/compose-context-provider'
import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { NativeModule, PrimitiveEventMetadata } from 'squarified'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { Text } from './components/text'
import { Tooltip } from './components/tooltip'
import { Treemap } from './components/treemap'
import type { TreemapComponentInstance } from './components/treemap'
import { ApplicationProvider, TreemapProvider } from './context'
import { convertBytes } from './shared'
import './css-baseline'
import 'virtual:stylex.css'
import { Spacer } from './components/spacer'
import { Receiver } from './receiver'

export function App() {
  const treeMapRef = useRef<TreemapComponentInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<NativeModule | null>(null)
  const [onTriggerMenu, setOnTriggerMenu] = useState<boolean>(false)

  const contexts = [
    <ApplicationProvider key="app" />,
    <TreemapProvider key="treemap" value={{ treemap: treeMapRef as RefObject<TreemapComponentInstance> }} />
  ]

  const handleMousemove = (data: PrimitiveEventMetadata<'mousemove'>) => {
    if (onTriggerMenu) {
      setTooltipVisible(false)
      return
    }
    setTooltipVisible(!!data.module)
    if (data.module) {
      // @ts-expect-error safe
      setTooltipContent(() => data.module.node)
    }
  }

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
        <Treemap
          ref={(instance: TreemapComponentInstance) => treeMapRef.current = instance}
          onMousemove={handleMousemove}
          onCloseTooltip={({ state }) => {
            setTooltipVisible(false)
            setOnTriggerMenu(state)
          }}
        />
        <Tooltip visible={tooltipVisible}>
          {tooltipContent && (
            <Text font="14px" div>
              {tooltipContent.filename}
              <Spacer inline w={.3} />
              {convertBytes(tooltipContent.weight)}
            </Text>
          )}
        </Tooltip>
      </div>
    </ComposeContextProvider>
  )
}
