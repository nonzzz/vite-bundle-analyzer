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
import { Modal } from './components/modal'
import { Spacer } from './components/spacer'
import { Receiver } from './receiver'

export function App() {
  const treeMapRef = useRef<TreemapComponentInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<NativeModule>({} as NativeModule)
  const [onTriggerMenu, setOnTriggerMenu] = useState<boolean>(false)
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false)

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
          onShowDetails={({ module }) => {
            setDetailModalVisible(true)
            setTooltipContent(module.node)
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
        <Modal visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} width="600px" height="700px">
          <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
            <Text b font="14px" mr={0.3}>Id:</Text>
            <Text font="14px">
              {tooltipContent.label}
            </Text>
          </div>
          <Spacer h={0.5} />
          <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
            <Text b p font="14px" mr={0.3}>Size:</Text>
            <Text font="14px">{convertBytes(tooltipContent.weight)}</Text>
          </div>
          <Spacer h={0.5} />
          <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
            <Text b font="14px" mr={0.3}>Path:</Text>
            <Text font="14px">
              {tooltipContent.filename}
            </Text>
          </div>
        </Modal>
      </div>
    </ComposeContextProvider>
  )
}
