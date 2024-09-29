/* eslint-disable no-use-before-define */
// Alough foamtree is very useful, but we don't need too much function.
// so implement a simple and lightweight treemap component.
import {} from './squarify'
import type { DuckModule, Module } from './interface'

export interface PaintEvent<E> {
  nativeEvent: E
  module: any
}

export interface PaintEventMap {
  mousemove: (this: Paint, event: PaintEvent<MouseEvent>) => void
}

export interface PaintOptions<T = DuckModule<Module>[]> {
  data: T[]
  evt?: Partial<PaintEventMap>
}

export interface PaintRect {
  w: number
  h: number
}

class Paint {
  private mountNode: HTMLDivElement | null
  private _canvas: HTMLCanvasElement | null
  private context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: DuckModule<Module>[]
  constructor() {
    this.mountNode = null
    this._canvas = null
    this.context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
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

  private eventHandler<T extends MouseEvent | WheelEvent>(e: T, handler: (evt: any) => void) {
    handler(e)
  }

  private draw() {
    //
  }

  dispose() {
    if (!this.mountNode) return
    this.mountNode.removeChild(this.canvas!)
    this.mountNode = null
    this._canvas = null
    this.context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
  }

  resize() {
    if (!this.mountNode) return
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
    }
    this.draw()
  }

  setOptions(options?: PaintOptions<DuckModule<Module>>) {
    if (!options || !this.canvas) return
    const { evt: userEvent, data } = options
    this.data = data
    this.resize()
    if (userEvent) {
      this.canvas.onmousemove = (e) =>
        this.eventHandler(e, (evt) => {
          this.canvas.style.cursor = 'pointer'
          userEvent.mousemove?.call(this, evt)
        })
    }
  }
}

export function createTreemap() {
  return new Paint()
}
