import React, { useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Radio, Spacer, Text } from '@geist-ui/core'
import style9 from 'style9'
import Menu from '@geist-ui/icons/menu'
import { tuple } from '../shared'
import { useApplicationContext } from '../context'
import type { Sizes } from '../interface'
import { FileList } from './file-list'

const styles = style9.create({
  visible: {
    visibility: 'hidden'
  },
  float: {
    top: '10px',
    left: '10px',
    zIndex: 10
  }
})

const MODE = tuple('Stat', 'Parsed', 'Gzipped')

export type ModeType = typeof MODE[number]

const MODE_RECORD: Record<Sizes, ModeType> = {
  statSize: 'Stat',
  parsedSize: 'Parsed',
  gzipSize: 'Gzipped'
}

export function SideBar() {
  const { sizes, scence, drawerVisible, foamModule, updateScence, updateSizes, updateDrawerVisible } = useApplicationContext()
  const [mode, setMode] = useState<ModeType>(() => MODE_RECORD[sizes])

  const allChunks = useMemo(() => foamModule.sort((a, b) => b[sizes] - a[sizes]), [foamModule, sizes])

  useEffect(() => updateScence(() => new Set(allChunks.map(v => v.id))), [allChunks, updateScence])

  const handleRadioChange = (type: ModeType) => {
    setMode(type)
    updateSizes(() => {
      if (type === 'Gzipped') return 'gzipSize'
      if (type === 'Stat') return 'statSize'
      return 'parsedSize'
    })
  }

  return <>
    <Button className={styles(drawerVisible && 'visible', 'float')} style={{ position: 'absolute' }} auto scale={0.25} icon={<Menu />} onClick={() => updateDrawerVisible((pre) => !pre)} />
    <Drawer visible={drawerVisible} placement='left' onClose={() => updateDrawerVisible(false)} w='400px'>
      <Drawer.Content>
        <div>
          <Text p b font='14px'>Treemap Sizes</Text>
          <Radio.Group value={mode} onChange={(s: any) => handleRadioChange(s)} useRow>
            {MODE.map(radio => <Radio value={radio} key={radio}>{radio}</Radio>)}
          </Radio.Group>
        </div>
        <Spacer h='1.5' />
        <div>
          <Text p b font='14px'>Show Chunks</Text>
          <FileList files={allChunks} extra={sizes} scence={scence} onChange={(v) => updateScence(() => new Set(v))} />
        </div>
      </Drawer.Content>
    </Drawer>
  </>
}
