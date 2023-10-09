import React, { useState } from 'react'
import { Button, Drawer, Input, Radio, Spacer, Text } from '@geist-ui/core'
import style9 from 'style9'
import { Menu } from '@geist-ui/icons'


const styles = style9.create({
  visible: {
    visibility: 'hidden'
  }
})

// props: SideBarProps
export function SideBar() {
  // const { pinned, ...rest } = props
  const [visible, setVisible] = useState<boolean>(false)
  const sizes = ['entry', 'render', 'gzipped']

  const handleDrawerClose = () => {
    setVisible(false)
  }

  return <>
    <Button className={styles(visible && 'visible')} auto scale={0.25} icon={<Menu />} onClick={() => setVisible(pre => !pre)} />
    <Drawer visible={visible} placement='left' onClose={handleDrawerClose} w='350px'>
      <Drawer.Content>
        <div>
          <Text p b font='14px'>Sizes</Text>
          <Radio.Group useRow>
            {sizes.map(radio => <Radio value={radio} key={radio}>{radio}</Radio>)}
          </Radio.Group>
        </div>
        <Spacer h='1.5' />
        <div>
          <Text p b font='14px'>Search Modules</Text>
          <Input crossOrigin clearable placeholder='Enter regexp' font='12px' w='300px' h='30px' />
        </div>
      </Drawer.Content>
    </Drawer>
  </>
}
