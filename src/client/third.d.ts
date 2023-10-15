declare module '@carrotsearch/foamtree' {

    export interface FoamDataObject  extends NonNullable<unknown>{
      id?: string
      label: string
      weight?: number
      open?: boolean
      exposed?: boolean
      selected?: boolean
      description?: boolean
      groups?: Array<FoamDataObject>
    }

    export interface FoamTreeOptions {
      element: HTMLElement
      layout: 'relaxed' | 'ordered' | 'squarified'
      stacking: 'hierarchical' | 'flattened'
      pixelRatio: number
      maxGroups: number
      maxGroupLevelsDrawn: number
      maxGroupLabelLevelsDrawn: number
      maxGroupLevelsAttached: number
      wireframeLabelDrawing: 'auto' | 'always' | 'never'
      groupMinDiameter: number
      groupLabelVerticalPadding: number
      rolloutDuration: number
      pullbackDuration: number
      fadeDuration: number
      groupExposureZoomMargin: number
      zoomMouseWheelDuration: number
      openCloseDuration: number
      dataObject: {
        groups: Array<FoamDataObject>
      }
      // eslint-disable-next-line no-use-before-define
      titleBarDecorator: FoamTitleBarDecorator
      // eslint-disable-next-line no-use-before-define
      groupColorDecorator: FoamGroupColorDecorator
      // eslint-disable-next-line no-use-before-define
      onGroupClick: FoamGroupClickEvent
    }
    export interface FoamContext {
      zoom(group: FoamDataObject): void
      resize(): void
      get(): FoamContext
      get(prop: string): FoamContext | undefined
      get(prop: string, ...args: unknown[]): FoamContext | undefined
    }

    export interface TitleBarDecoratorVariables {
      titleBarText: string
      titleBarShown: boolean
      titleBarMaxFontSize: number
    }
    
    interface RGBGroupColorDecoratoVariables {
      model: 'rgb' | 'rgba'
      r: number
      g: number
      b: number
    }

    interface HLSGroupColorDecoratoVariables{
      model: 'hsla' | 'hsl'
      h: number
      s: number
      l: number
    }

    export type GroupColorDecoratoVariables = (RGBGroupColorDecoratoVariables | HLSGroupColorDecoratoVariables) & {
      a?: number
    }

    export interface GroupColorVariables {
      groupColor?: GroupColorDecoratoVariables
      labelColor?: 'auto'
    }

    export type FoamTitleBarDecorator = (this: FoamContext, options: FoamTreeOptions, properties: NonNullable<unknown>, variables: TitleBarDecoratorVariables)=> void

    export type FoamGroupColorDecorator = (this: FoamContext, options: FoamTreeOptions, properties: NonNullable<unknown>, variables: GroupColorVariables)=> void

    export interface FoamEventObject {
      type: 'click' | 'dragstart'
      group: FoamDataObject
      topmostClosedGroup: FoamDataObject
      bottommostOpenGroup: FoamDataObject
      x: number
      y: number
      xAbsolute: number
      yAbsolute: number
      secondary: boolean
      touches: number
      scale: number
      delta: number
      ctrlKey: boolean
      altKey: boolean
      metaKey: boolean
      shiftKey: boolean
      preventDefault(): void
      preventOriginalEventDefault(): void
      allowOriginalEventDefault(): void
    }

    export type FoamGroupClickEvent = (this: FoamContext, event: FoamEventObject)=> void

    declare class FoamTree {
      constructor(opts: Partial<FoamTreeOptions>)
    }

    export { FoamTree }
    export default FoamTree
} 
