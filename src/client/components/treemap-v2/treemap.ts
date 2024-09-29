/* eslint-disable no-use-before-define */
// Alough foamtree is very useful, but we don't need too much function.
// so implement a simple and lightweight treemap component.
import { squarify } from './squarify'
import type { DuckModule, NativeModule } from './interface'

export interface PaintEvent<E> {
  nativeEvent: E
  module: any
}

export interface PaintEventMap {
  mousemove: (this: Paint, event: PaintEvent<MouseEvent>) => void
}

export interface PaintOptions<T> {
  data: DuckModule<T>[]
  evt?: Partial<PaintEventMap>
}

export interface PaintRect {
  w: number
  h: number
}

function createPaintEventHandler(canvas: HTMLCanvasElement, eventType: keyof PaintEventMap, handler: EventListener) {
  canvas.addEventListener(eventType, handler)
  return { handler }
}

class Paint {
  private mountNode: HTMLDivElement | null
  private _canvas: HTMLCanvasElement | null
  private context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: DuckModule<NativeModule>[]
  private eventMaps: Record<string, EventListener>
  constructor() {
    this.mountNode = null
    this._canvas = null
    this.context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
    this.eventMaps = Object.create(null)
  }

  init(element: HTMLElement) {
    this.mountNode = element as HTMLDivElement
    this._canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')
    this.mountNode.appendChild(this.canvas)
    return this
  }

  zoom() {}

  private get ctx() {
    return this.context!
  }

  private get canvas() {
    return this._canvas!
  }

  private eventHandler<T extends keyof PaintEventMap, E extends Event>(type: T, e: E, handler: PaintEventMap[T]) {
    switch (type) {
      case 'mousemove':
        this.canvas.style.cursor = 'pointer'
        break
    }
    handler.call(this, {
      nativeEvent: e as unknown as MouseEvent,
      module: {}
    })
  }

  private draw() {
    //
  }

  private deinitEventMaps() {
    if (this.eventMaps) {
      for (const evt in this.eventMaps) {
        this.canvas.removeEventListener(evt, this.eventMaps[evt])
      }
    }
  }

  private deinit(release = false) {
    if (!this.mountNode) return
    this.deinitEventMaps()
    this.mountNode.removeChild(this.canvas!)
    if (release) {
      this.mountNode = null
    }
    this._canvas = null
    this.context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
  }

  dispose() {
    this.deinit(true)
  }

  resize() {
    if (!this.mountNode || !this.canvas) return
    const previousRect = { ...this.rect }
    const ratio = window.devicePixelRatio || 1
    const { width, height } = this.mountNode.getBoundingClientRect()
    this.rect = { w: width, h: height }
    this.canvas.height = Math.round(height * ratio)
    this.canvas.width = Math.round(width * ratio)
    this.canvas.style.cssText = `width: ${width}px; height: ${height}px`
    this.ctx.scale(ratio, ratio)
    if (previousRect.w !== width || previousRect.h !== height) {
      // squarify layout
      squarify(this.data, 0, 0, width, height)
    }
    this.draw()
  }

  setOptions<T extends NativeModule>(options?: PaintOptions<T>) {
    if (!options) return
    const { evt: userEvent, data } = options
    this.data = data
    const unReady = !this.data.length
    if (unReady) {
      if (this.mountNode && this.canvas) {
        this.deinit()
      }
      return
    }
    if (!this._canvas) {
      this.init(this.mountNode!)
    }

    this.deinitEventMaps()

    if (userEvent) {
      for (const evt in userEvent) {
        const { handler } = createPaintEventHandler(this.canvas, evt as keyof PaintEventMap, (e) => {
          this.eventHandler(evt as keyof PaintEventMap, e, userEvent[evt as keyof PaintEventMap]!)
        })
        const nativeEventName = 'on' + evt
        this.eventMaps[nativeEventName] = handler
        // @ts-expect-error
        this.canvas[nativeEventName] = handler
      }
    }
    this.resize()
  }
}

export function createTreemap() {
  return new Paint()
}
