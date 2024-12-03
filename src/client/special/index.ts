export const ALLOWED_MAGIC_TYPE = ['graph:click', 'client:ready', 'send:ui'] as const

export type AllowedMagicType = typeof ALLOWED_MAGIC_TYPE[number]

export function createMagicEvent(type: AllowedMagicType, data: any) {
  return new CustomEvent(type, { detail: data })
}

export type QueryKind = 'gzip' | 'stat' | 'parsed'

export const IS_CUSTOM_SIDE_BAR = window.CUSTOM_SIDE_BAR === true

export interface SendUIMessage {
  Component: () => JSX.Element
  type: 'SideBar' | 'Main'
}
