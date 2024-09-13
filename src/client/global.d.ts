import { Module } from 'src/server/interface'
import { DefaultSizes } from '../server/interface'

declare global {
  interface Window {
    defaultSizes: DefaultSizes
    analyzeModule: Array<Module>
    isCacheLastSiezMode:boolean
  }
}
