import { noop } from 'foxact/noop'
import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { sortChildrenByKey } from 'squarified'
import Menu from '~icons/ph/list'
import { useApplicationContext, useToggleSize, useUpdateScence } from '../../context'
import { tuple } from '../../shared'
import { IS_CUSTOM_SIDE_BAR } from '../../special'
import { Button } from '../button'
import { Drawer } from '../drawer'
import { FileList } from '../file-list'
import { SearchModules } from '../search-modules'
import { Select } from '../select'
import type { SelectInstance } from '../select'
import { Text } from '../text'
import { useSidebarState, useToggleDrawerVisible } from './provide'

const MODES = tuple('Stat', 'Parsed', 'Gzipped')

export type ModeType = typeof MODES[number]

export interface SidebarProps {
  onVisibleChange?: (state: boolean) => void
}

export function Sidebar({ onVisibleChange = noop }: SidebarProps) {
  const { drawerVisibile } = useSidebarState()
  const toggleDrawerVisible = useToggleDrawerVisible()
  const { scence, analyzeModule, sizes: userMode, ui } = useApplicationContext()
  const updateScence = useUpdateScence()
  const toggleSize = useToggleSize()
  const [entrypoints, setEntrypoints] = useState<string[]>([])
  const selectRef = useRef<SelectInstance>(null)
  const customMainRef = useRef<HTMLDivElement>(null)

  const allChunks = useMemo(() => {
    const points = new Set(entrypoints)
    return sortChildrenByKey(
      analyzeModule.filter((chunk) => !points.size || points.has(chunk.label) || chunk.imports.some((id) => points.has(id)))
        .map((chunk) => ({ ...chunk, groups: userMode === 'statSize' ? chunk.stats : chunk.source })),
      userMode,
      'label'
    )
  }, [analyzeModule, userMode, entrypoints])

  const mode = useMemo<ModeType>(() => userMode === 'gzipSize' ? 'Gzipped' : userMode === 'statSize' ? 'Stat' : 'Parsed', [userMode])

  const entrypointChunks = useMemo(() => analyzeModule.filter((chunk) => chunk.isEntry), [analyzeModule])

  const handleFilterByEntrypoints = (entrypoint: string | string[]) => {
    setEntrypoints(Array.isArray(entrypoint) ? entrypoint : [entrypoint])
  }

  useEffect(() => updateScence(new Set(allChunks.map((c) => c.label))), [allChunks, updateScence])

  const handleDrawerClose = () => {
    selectRef.current?.destory()
    toggleDrawerVisible()
  }

  return (
    <>
      <Button
        style={{ position: 'absolute' }}
        auto
        scale={0.25}
        icon={<Menu />}
        onClick={() => {
          onVisibleChange(!drawerVisibile)
          toggleDrawerVisible()
        }}
        stylex={{
          top: '10px',
          left: '10px',
          zIndex: 10,
          ...(drawerVisibile && { visibility: 'hidden' })
        }}
      />
      {IS_CUSTOM_SIDE_BAR && (
        <div ref={customMainRef} id="customMain">
          {createElement(ui.Main ? ui.Main : 'div', null)}
        </div>
      )}
      <Drawer
        visible={drawerVisibile}
        padding={0}
        onClose={handleDrawerClose}
        width="450px"
      >
        <Drawer.Content paddingTop={0.25}>
          <div>
            <Text p b h3>Treemap Sizes:</Text>
            <div
              stylex={{
                display: 'flex',
                flexWrap: 'nowrap'
              }}
            >
              {MODES.map((button) => (
                <div key={button} stylex={{ padding: '5px', boxSizing: 'border-box' }}>
                  <Button
                    onClick={() => toggleSize(button === 'Gzipped' ? 'gzipSize' : button === 'Stat' ? 'statSize' : 'parsedSize')}
                    auto
                    type={mode === button ? 'secondary' : 'default'}
                    scale={0.7}
                  >
                    {button}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {IS_CUSTOM_SIDE_BAR
            ? (
              <div id="customSideBar">
                {createElement(ui.SideBar ? ui.SideBar : 'div', null)}
              </div>
            )
            : (
              <>
                <div>
                  <Text p b h3>Filter by entrypoints:</Text>
                  <Select
                    ref={selectRef}
                    multiple
                    scale={0.75}
                    placeholder="Select endpoints"
                    width="95.5%"
                    onChange={handleFilterByEntrypoints}
                    options={entrypointChunks.map((chunk) => ({ value: chunk.label, label: chunk.label }))}
                  />
                </div>
                <div>
                  <Text p b h3>Search modules:</Text>
                  <SearchModules extra={userMode} files={allChunks} />
                </div>
                <div>
                  <Text p b h3>Show Chunks:</Text>
                  <FileList
                    files={allChunks}
                    extra={userMode}
                    scence={scence}
                    onChange={(v) => updateScence(new Set(v))}
                  />
                </div>
              </>
            )}
        </Drawer.Content>
      </Drawer>
    </>
  )
}
