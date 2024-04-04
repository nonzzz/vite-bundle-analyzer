import React, { useImperativeHandle, useRef } from 'react'
import Dropdown from '@geist-ui/core/esm/shared/dropdown'
import * as stylex from '@stylexjs/stylex'
import { useSelect } from './context'

interface Props {
  visible: boolean
}
  
export type SelectDropdownProps = Omit<React.HTMLAttributes<any>, keyof Props> & Props

const styles = stylex.create({
  dropdown: {
    borderRadius: '6px',
    boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)',
    backgroundColor: '#fff',
    maxHeight: '17em',
    overflowY: 'auto',
    overflowAnchor: 'none',
    padding: '0.38em 0',
    scrollBehavior: 'smooth'
  }
})

const SelectDropdown = React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<SelectDropdownProps>
  >(({ visible, children }, dropdownRef) => {
    const internalDropdownRef = useRef<HTMLDivElement | null>(null)
    const { ref } = useSelect()
  
    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      dropdownRef,
      () => internalDropdownRef.current
    )
  
    return (
      <Dropdown
        parent={ref}
        visible={visible}
      >
        <div ref={internalDropdownRef} {...stylex.props(styles.dropdown)}>
          {children}
        </div>
      </Dropdown>
    )
  }
  )
  
SelectDropdown.displayName = 'SelectDropdown'

export { SelectDropdown }
