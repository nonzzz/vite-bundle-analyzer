import type { Module } from '../server/interface'
import type { DefaultSizes } from '../server/interface'

declare global {
  interface Window {
    defaultSizes: DefaultSizes
    analyzeModule: Array<Module>
    CUSTOM_SIDE_BAR: boolean
  }
}
