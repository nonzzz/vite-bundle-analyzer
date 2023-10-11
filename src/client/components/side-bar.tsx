import React, { useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Input, Radio, Spacer, Text } from '@geist-ui/core'
import style9 from 'style9'
import Menu from '@geist-ui/icons/menu'
import { omit, tuple } from '../shared'
import { useApplicationContext } from '../context'
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

const MODE_RECORD: Record<typeof window['defaultSizes'], ModeType> = {
  stat: 'Stat',
  parsed: 'Parsed',
  gzip: 'Gzipped'
}

// props: SideBarProps
export function SideBar() {
  const { defaultSizes, prettyModule: initialPrettyModule } = useApplicationContext()
  const [visible, setVisible] = useState<boolean>(false)
  const [mode, setMode] = useState<ModeType | number | string & NonNullable<unknown>>()
  const [prettyModule, setPrettyModule] = useState<typeof window['prettyModule']>([])

  useEffect(() => {
    setMode(MODE_RECORD[defaultSizes])
    setPrettyModule(() => [...initialPrettyModule])
  }, [defaultSizes, initialPrettyModule])


  const allChunks = useMemo(() => prettyModule.map(m => omit(m, ['children'])), [prettyModule])

  const handleDrawerClose = () => {
    setVisible(false)
  }

  return <>
    <Button className={styles(visible && 'visible', 'float')} auto scale={0.25} icon={<Menu />} onClick={() => setVisible(pre => !pre)} />
    <Drawer visible={visible} placement='left' onClose={handleDrawerClose} w='400px'>
      <Drawer.Content>
        <div>
          <Text p b font='14px'>Treemap Sizes</Text>
          <Radio.Group value={mode} onChange={(s) => setMode(s)} useRow>
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
          <FileList initialExpand files={allChunks} />
        </div>
      </Drawer.Content>
    </Drawer>
  </>
}
