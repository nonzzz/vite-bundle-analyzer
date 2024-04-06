import { noop } from 'foxact/noop'
import { useEffect, useMemo, useState } from 'react'
import stylex from '@stylexjs/stylex'
import { Text } from '../text'
import { useApplicationContext } from '../../context'
import type { Sizes } from '../../interface'
import { tuple } from '../../shared'
import { Button } from '../button'
import { Select } from '../select'
import { Drawer } from '../drawer'
import { FileList } from '../file-list'
import { SearchModules } from '../search-modules'
import { useSidebarState, useToggleDrawerVisible } from './provide'
import Menu from '~icons/ph/list'

const MODES = tuple('Stat', 'Parsed', 'Gzipped')

export type ModeType = typeof MODES[number]

const styles = stylex.create({
  visible: {
    visibility: 'hidden'
  },
  float: {
    top: '10px',
    left: '10px',
    zIndex: 10
  },
  flexable: {
    display: 'flex',
    flexWrap: 'nowrap'
  },
  flexItem: {
    padding: '5px',
    boxSizing: 'border-box'
  }
})

export interface SidebarProps {
  foamModule: typeof window.foamModule
  mode: Sizes
  onVisibleChange?: (state: boolean) => void
  onModeChange?: (size: ModeType) => void
}

export function Sidebar({ foamModule, mode: userMode = 'statSize', onModeChange = noop, onVisibleChange = noop }: SidebarProps) {
  const { drawerVisibile } = useSidebarState()
  const toggleDrawerVisible = useToggleDrawerVisible()
  const { scence, updateScence } = useApplicationContext()

  const [entrypoints, setEntrypoints] = useState<string[]>([])

  const allChunks = useMemo(() => foamModule
    .filter(chunk => !entrypoints.length || entrypoints.some(id => chunk.id === id || chunk.imports.includes(id)))
    .sort((a, b) => b[userMode] - a[userMode]), [foamModule, userMode, entrypoints])

  const mode = useMemo<ModeType>(() => userMode === 'gzipSize' ? 'Gzipped' : userMode === 'statSize' ? 'Stat' : 'Parsed', [userMode])

  const entrypointChunks = useMemo(() => foamModule.filter(chunk => chunk.isEntry), [foamModule])

  const handleFilterByEntrypoints = (entrypoint: string | string[]) => {
    setEntrypoints(Array.isArray(entrypoint) ? entrypoint : [entrypoint])
  }

  useEffect(() => updateScence(() => new Set(allChunks.map(v => v.id))), [allChunks, updateScence])

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
        {...stylex.props(drawerVisibile && styles.visible, styles.float)}
      />
      <Drawer
        visible={drawerVisibile}
        padding={0}
        onClose={toggleDrawerVisible}
        width="450px"
      >
        <Drawer.Content paddingTop={0.25}>
          <div>
            <Text p b h3>Treemap Sizes:</Text>
            <div {...stylex.props(styles.flexable)}>
              {MODES.map(button => (
                <div key={button} {...stylex.props(styles.flexItem)}>
                  <Button
                    onClick={() => onModeChange(button)}
                    auto
                    type={mode === button ? 'secondary' : 'default'}
                    scale={0.7}
                  >
                    {button}
                  </Button>
                </div>
              )
              )}
            </div>
          </div>
          <div>
            <Text p b h3>Filter by entrypoints:</Text>
            <Select
              scale={0.75}
              placeholder="Select endpoints"
              multiple
              width="95.5%"
              onChange={handleFilterByEntrypoints}
            >
              {entrypointChunks.map(chunk => (
                <Select.Option key={chunk.id} value={chunk.id}>{chunk.id}</Select.Option>
              ))}
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
              onChange={(v) => updateScence(() => new Set(v))}
            />
          </div>
        </Drawer.Content>
      </Drawer>
    </>
  )
}
