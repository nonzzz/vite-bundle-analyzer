import { CompiledStyles } from '@stylexjs/stylex/lib/StyleXTypes'
import { Module } from 'src/server/interface'
import { DefaultSizes } from '../server/interface'

declare global {
  interface Window {
    defaultSizes: DefaultSizes
    analyzeModule: Array<Module>
    CUSTOM_SIDE_BAR: boolean
  }
}

declare module '@stylex-extend/core' {
  import { CSSObject, StylexCSS } from '@stylex-extend/shared'

  export declare function injectGlobalStyle(..._: Array<Record<string, StylexCSS>>): string
  export declare function inline(_: CSSObject): CompiledStyles
}
