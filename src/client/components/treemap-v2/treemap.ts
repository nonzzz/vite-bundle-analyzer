/* eslint-disable no-use-before-define */
// Alough foamtree is very useful, but we don't need too much function.
// so implement a simple and lightweight treemap component.
import { hashCode } from '../../shared'
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

function getColorMappings<T = NativeModule>(data: T[]) {
  const colorMappings: Record<string, string> = {}

  const chunkNamePartIndex = ((data: NativeModule[]) => {
    const splitChunkNames = data.map((m) => m.label.split(/[^a-z0-9]/iu))
    const longestSplitName = Math.max(...splitChunkNames.map((parts) => parts.length))
    const namePart = {
      index: 0,
      votes: 0
    }
    for (let i = longestSplitName - 1; i >= 0; i--) {
      const identifierVotes = {
        name: 0,
        hash: 0,
        ext: 0
      }
      let lastChunkPart = ''
      for (const splitChunkName of splitChunkNames) {
        const part = splitChunkName[i]
        if (part === undefined || part === '') {
          continue
        }
        if (part === lastChunkPart) {
          identifierVotes.ext++
        } else if (/[a-z]/u.test(part) && /[0-9]/u.test(part) && part.length === lastChunkPart.length) {
          identifierVotes.hash++
        } else if (/^[a-z]+$/iu.test(part) || /^[0-9]+$/u.test(part)) {
          identifierVotes.name++
        }
        lastChunkPart = part
      }
      if (identifierVotes.name >= namePart.votes) {
        namePart.index = i
        namePart.votes = identifierVotes.name
      }
    }
    return namePart.index
  })(data as NativeModule[])

  const toColor = (chunkLabel: string, depth: number) => {
    const s = chunkLabel.split(/[^a-z0-9]/iu)[chunkNamePartIndex] || chunkLabel
    const hash = /[^0-9]/.test(s) ? hashCode(s) : (parseInt(s) / 1000) * 360
    const saturation = 60 - depth * 5
    const lightness = 50 + depth * 5
    return `hsla(${Math.round(Math.abs(hash) % 360)}deg, ${Math.max(saturation, 30)}%, ${Math.min(lightness, 70)}%, 0.9)`
  }

  const assignColorByDirectory = (data: NativeModule, root: NativeModule, depth: number) => {
    colorMappings[data.filename] = toColor(root.filename, depth)
    depth = depth-- < 0 ? 0 : depth
    if (data.groups) {
      for (const child of data.groups) {
        assignColorByDirectory(child, root, depth)
      }
    }
  }
  for (const child of data) {
    // @ts-expect-error
    assignColorByDirectory(child as NativeModule, child as NativeModule, child.groups.length ?? 0)
  }

  return colorMappings
}

class Paint {
  private mountNode: HTMLDivElement | null
  private _canvas: HTMLCanvasElement | null
  private context: CanvasRenderingContext2D | null
  private rect: PaintRect
  private data: DuckModule<NativeModule>[]
  private eventMaps: Record<string, EventListener>
  private colorMappings: Record<string, string>
  constructor() {
    this.mountNode = null
    this._canvas = null
    this.context = null
    this.data = []
    this.rect = { w: 0, h: 0 }
    this.eventMaps = Object.create(null)
    this.colorMappings = Object.create(null)
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
    this.colorMappings = Object.create(null)
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
    this.colorMappings = getColorMappings(this.data)
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
