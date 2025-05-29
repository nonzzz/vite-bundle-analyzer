import React from 'react'

export interface SelectContextConfig {
  value?: string | string[]
  updateValue?: (next: string) => unknown
  visible?: boolean
  updateVisible?: (next: boolean) => unknown
  disableAll: boolean
  ref: React.RefObject<HTMLDivElement>
}

const defaultContext = <SelectContextConfig> {
  visible: false,
  disableAll: false
}

const SelectContext = React.createContext<SelectContextConfig>(defaultContext)

export function useSelect() {
  return React.useContext(SelectContext)
}

export const { Provider } = SelectContext
