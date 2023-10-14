import React, { useMemo, useState } from 'react'
import { Button, Drawer, Input, Radio, Spacer, Text } from '@geist-ui/core'
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
    position: 'fixed',
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
  const { sizes, updateSizes, foamModule } = useApplicationContext()
  const [visible, setVisible] = useState<boolean>(false)
  const [mode, setMode] = useState<ModeType>(() => MODE_RECORD[sizes])

  const allChunks = useMemo(() => foamModule.sort((a, b) => b[sizes] - a[sizes]), [foamModule, sizes])

  const handleDrawerClose = () => {
    setVisible(false)
  }

  const handleRadioChange = (type: ModeType) => {
    setMode(type)
    updateSizes(() => {
      if (type === 'Gzipped') return 'gzipSize'
      if (type === 'Stat') return 'statSize'
      return 'parsedSize'
    })
  }

  return <>
    <Button className={styles(visible && 'visible', 'float')} auto scale={0.25} icon={<Menu />} onClick={() => setVisible(pre => !pre)} />
    <Drawer visible={visible} placement='left' onClose={handleDrawerClose} w='400px'>
      <Drawer.Content>
        <div>
          <Text p b font='14px'>Treemap Sizes</Text>
          <Radio.Group value={mode} onChange={(s: any) => handleRadioChange(s)} useRow>
            {MODE.map(radio => <Radio value={radio} key={radio}>{radio}</Radio>)}
          </Radio.Group>
        </div>
        <Spacer h='1.5' />
        <div>
          <Text p b font='14px'>Search Modules</Text>
          <Input crossOrigin='true' clearable placeholder='Enter regexp' font='12px' w='300px' h='30px' />
        </div>
        <Spacer h='1.5' />
        <div>
          <Text p b font='14px'>Show Chunks</Text>
          <FileList initialExpand files={allChunks} extra={sizes} />
        </div>
      </Drawer.Content>
    </Drawer>
  </>
}
