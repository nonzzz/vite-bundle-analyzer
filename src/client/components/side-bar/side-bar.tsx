import { useEffect, useMemo, useRef, useState } from 'react'
import { noop } from 'foxact/noop'
import { sortChildrenByKey } from 'squarified'
import { Text } from '../text'
import { useApplicationContext, useToggleSize, useUpdateScence } from '../../context'
import { tuple } from '../../shared'
import { Button } from '../button'
import { Select } from '../select'
import type { SelectInstance } from '../select'
import { Drawer } from '../drawer'
import { FileList } from '../file-list'
import { SearchModules } from '../search-modules'
import { useSidebarState, useToggleDrawerVisible } from './provide'
import Menu from '~icons/ph/list'

const MODES = tuple('Stat', 'Parsed', 'Gzipped')

export type ModeType = typeof MODES[number]

export interface SidebarProps {
  onVisibleChange?: (state: boolean) => void
}

export function Sidebar({ onVisibleChange = noop }: SidebarProps) {
  const { drawerVisibile } = useSidebarState()
  const toggleDrawerVisible = useToggleDrawerVisible()
  const { scence, analyzeModule, sizes: userMode } = useApplicationContext()
  const updateScence = useUpdateScence()
  const toggleSize = useToggleSize()
  const [entrypoints, setEntrypoints] = useState<string[]>([])
  const selectRef = useRef<SelectInstance>(null)

  const allChunks = useMemo(() => {
    const points = new Set(entrypoints)
    return sortChildrenByKey(
      analyzeModule.filter(chunk => !points.size || points.has(chunk.label) || chunk.imports.some(id => points.has(id)))
        .map((chunk) => ({ ...chunk, groups: userMode === 'statSize' ? chunk.stats : chunk.source })),
      userMode,
      'label'
    )
  }, [analyzeModule, userMode, entrypoints])

  const mode = useMemo<ModeType>(() => userMode === 'gzipSize' ? 'Gzipped' : userMode === 'statSize' ? 'Stat' : 'Parsed', [userMode])

  const entrypointChunks = useMemo(() => analyzeModule.filter(chunk => chunk.isEntry), [analyzeModule])

  const handleFilterByEntrypoints = (entrypoint: string | string[]) => {
    setEntrypoints(Array.isArray(entrypoint) ? entrypoint : [entrypoint])
  }

  useEffect(() => updateScence(new Set(allChunks.map(c => c.label))), [allChunks, updateScence])

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
              {MODES.map(button => (
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
          <div>
            <Text p b h3>Filter by entrypoints:</Text>
            <Select
              ref={selectRef}
              scale={0.75}
              placeholder="Select endpoints"
              multiple
              width="95.5%"
              onChange={handleFilterByEntrypoints}
            >
              {entrypointChunks.map(chunk => <Select.Option key={chunk.label} value={chunk.label}>{chunk.label}</Select.Option>)}
            </Select>
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
        </Drawer.Content>
      </Drawer>
    </>
  )
}
