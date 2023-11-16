import { useEffect, useMemo, useState } from 'react'
import style9 from 'style9'
import { Button, Drawer, Grid, Select, Text } from '@geist-ui/core'
import Menu from '@geist-ui/icons/menu'
import { tuple } from '../shared'
import { useApplicationContext } from '../context'
import type { Sizes } from '../interface'
import { FileList } from './file-list'
import { SearchModules } from './search-modules'

const styles = style9.create({
  visible: {
    visibility: 'hidden'
  },
  float: {
    top: '10px',
    left: '10px',
    zIndex: 10
  },
  sideBar: {
    minWidth: '450px'
  }
})

const MODES = tuple('Stat', 'Parsed', 'Gzipped')

export type ModeType = typeof MODES[number]

const MODE_RECORD: Record<Sizes, ModeType> = {
  statSize: 'Stat',
  parsedSize: 'Parsed',
  gzipSize: 'Gzipped'
}

export function SideBar() {
  const {
    sizes,
    scence,
    drawerVisible,
    foamModule,
    updateScence,
    updateSizes,
    updateDrawerVisible
  } = useApplicationContext()
  const [mode, setMode] = useState<ModeType>(() => MODE_RECORD[sizes])
  const [entrypoints, setEntrypoints] = useState<string[]>([])

  const allChunks = useMemo(() => foamModule
    .filter(chunk => !entrypoints.length || entrypoints.some(id => chunk.id === id || chunk.imports.includes(id)))
    .sort((a, b) => b[sizes] - a[sizes]), [foamModule, sizes, entrypoints])

  const entrypointChunks = useMemo(() => foamModule.filter(chunk => chunk.isEntry), [foamModule])

  useEffect(() => updateScence(() => new Set(allChunks.map(v => v.id))), [allChunks, updateScence])

  const handleRadioChange = (type: ModeType) => {
    setMode(type)
    updateSizes(() => {
      if (type === 'Gzipped') return 'gzipSize'
      if (type === 'Stat') return 'statSize'
      return 'parsedSize'
    })
  }

  const handleFilterByEntrypoints = (entrypoint: string | string[]) => {
    setEntrypoints(Array.isArray(entrypoint) ? entrypoint : [entrypoint])
  }

  return (
    <>
      <Button
        className={styles(drawerVisible && 'visible', 'float')}
        style={{ position: 'absolute' }}
        auto
        scale={0.25}
        icon={<Menu />}
        onClick={() => updateDrawerVisible((pre) => !pre)}
      />
      <Drawer
        visible={drawerVisible}
        placement="left"
        padding={0}
        onClose={() => updateDrawerVisible(false)}
        className={styles('sideBar')}
        width="15vw"
      >
        <Drawer.Content paddingTop={0.25}>
          <div>
            <Text p b h3>Treemap Sizes:</Text>
            <Grid.Container gap={1} wrap="nowrap">
              {
                                MODES.map(button => (
                                  <Grid key={button}>
                                    <Button
                                      onClick={() => handleRadioChange(button)}
                                      auto
                                      type={mode === button ? 'secondary' : 'default'}
                                      scale={0.7}
                                    >
                                      {button}
                                    </Button>
                                  </Grid>
                                )
                                )
                            }
            </Grid.Container>
          </div>
          <div>
            <Text p b h3>Filter by entrypoints:</Text>
            <Select
              scale={0.75}
              placeholder="Select endpoints"
              multiple
              type="secondary"
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
            <SearchModules extra={sizes} files={allChunks} />
          </div>
          <div>
            <Text p b h3>Show Chunks:</Text>
            <FileList
              files={allChunks}
              extra={sizes}
              scence={scence}
              onChange={(v) => updateScence(() => new Set(v))}
            />
          </div>
        </Drawer.Content>
      </Drawer>
    </>
  )
}
