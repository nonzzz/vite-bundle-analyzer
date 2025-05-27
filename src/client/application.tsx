import { ComposeContextProvider } from 'foxact/compose-context-provider'
import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { NativeModule, PrimitiveEventMetadata } from 'squarified'
import File from '~icons/ph/file-duotone'
import { Sidebar, SidebarProvider } from './components/side-bar'
import { Text } from './components/text'
import { Tooltip } from './components/tooltip'
import { Treemap } from './components/treemap'
import type { TreemapComponentInstance } from './components/treemap'
import { ApplicationProvider, TreemapProvider } from './context'
import { convertBytes } from './shared'
import './css-baseline'
import 'virtual:stylex.css'
import type { ImportedBy } from '../server/trie'
import { Modal } from './components/modal'
import { Spacer } from './components/spacer'
import { Receiver } from './receiver'
import { TextWithTooltip } from './text-tips'

type TooltipContent = NativeModule & { importedBy: ImportedBy[], filename: string, label: string }

export function App() {
  const treeMapRef = useRef<TreemapComponentInstance>()
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false)
  const [tooltipContent, setTooltipContent] = useState<TooltipContent>({} as TooltipContent)
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
            setTooltipContent(module.node as TooltipContent)
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
          <div stylex={{ textAlign: 'initial' }}>
            {tooltipContent.label && (
              <>
                <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
                  <Text b font="14px" mr={0.3}>Id:</Text>
                  <TextWithTooltip text={tooltipContent.label} />
                </div>
                <Spacer h={0.5} />
              </>
            )}
            <div stylex={{ display: 'inline-flex', whiteSpace: 'nowrap', width: '100%' }}>
              <Text b p font="14px" mr={0.3}>Size:</Text>
              <Text font="14px">{convertBytes(tooltipContent.weight)}</Text>
            </div>
            <Spacer h={0.5} />
            {tooltipContent.filename && (
              <>
                <div
                  stylex={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Text b font="14px" mr={0.3}>Path:</Text>
                  <TextWithTooltip text={tooltipContent.filename || ''} />
                </div>
                <Spacer h={2} />
              </>
            )}
            <div>
              <Text p b font="14px">Dependencies Graphic</Text>
              {tooltipContent.importedBy?.length > 0
                ? (
                  <div stylex={{ marginTop: '12px' }}>
                    <div stylex={{ marginBottom: '16px' }}>
                      <div
                        stylex={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '8px',
                          borderBottom: '1px solid rgba(180,180,180,0.2)',
                          paddingBottom: '4px'
                        }}
                      >
                        <div
                          stylex={{
                            backgroundColor: '#0ea5e9',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            marginRight: '6px'
                          }}
                        />
                        <Text b font="13px">Static Imports</Text>
                      </div>

                      <div stylex={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tooltipContent.importedBy
                          .filter((imported) => imported.kind === 'static')
                          .map((imported) => (
                            <div
                              key={imported.id}
                              stylex={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s',
                                cursor: 'pointer',
                                ':hover': { backgroundColor: 'rgba(60,60,60,0.1)' }
                              }}
                            >
                              <File stylex={{ color: '#0ea5e9', marginRight: '8px' }} />
                              <TextWithTooltip text={imported.id} />
                            </div>
                          ))}

                        {!tooltipContent.importedBy.some((i) => i.kind === 'static') && <Text font="13px">No static imports</Text>}
                      </div>
                    </div>

                    <div>
                      <div
                        stylex={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '8px',
                          borderBottom: '1px solid rgba(180,180,180,0.2)',
                          paddingBottom: '4px'
                        }}
                      >
                        <div
                          stylex={{
                            backgroundColor: '#f97316',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            marginRight: '6px'
                          }}
                        />
                        <Text b font="13px">Dynamic Imports</Text>
                      </div>

                      <div stylex={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tooltipContent.importedBy
                          .filter((imported) => imported.kind === 'dynamic')
                          .map((imported) => (
                            <div
                              key={imported.id}
                              stylex={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s',
                                cursor: 'pointer',
                                ':hover': { backgroundColor: 'rgba(60,60,60,0.1)' }
                              }}
                            >
                              <File stylex={{ color: '#f97316', marginRight: '8px' }} />
                              <TextWithTooltip text={imported.id} />
                            </div>
                          ))}

                        {!tooltipContent.importedBy.some((i) => i.kind === 'dynamic') && <Text font="13px">No dynamic imports</Text>}
                      </div>
                    </div>
                  </div>
                )
                : <Text p font="14px">No dependencies</Text>}
            </div>
          </div>
        </Modal>
      </div>
    </ComposeContextProvider>
  )
}
