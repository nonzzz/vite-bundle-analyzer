/* eslint-disable no-use-before-define */

import type { Module, SquarifiedModule } from './interface'
import { STYLES, charCodeWidth, evaluateHueFromModule, findRelativeNode, hueAngleToColor, textOverflowEllipsis } from './shared'
import { squarify } from './squared'

interface Shape {
  width: number
  height: number
}

export interface PaintEvent<T> {
  nativeEvent: T
  module: SquarifiedModule | null
}

export interface PaintOptions {
  onMousemove?: (this: Paint, event: PaintEvent<MouseEvent>) => void
  onClick?: (this: Paint, event: PaintEvent<MouseEvent>) => void
  onMouseWheel?: (this: Paint, event: PaintEvent<WheelEvent>) => void
}

const defaultShape = { width: 0, height: 0 }

export class Paint {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private shape: Shape
  private mainEl: HTMLElement | null
  private data: Module[]
  private layoutNodes: SquarifiedModule[]
  private colorMapping: Record<string, string>
  private options: PaintOptions
  private currentNode: SquarifiedModule | null
  private animationFrame: number | null
  constructor(data: Module[]) {
    this.mainEl = null
    this.currentNode = null
    this.data = data
    this.layoutNodes = []
    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')!
    this.shape = { ...defaultShape }
    this.colorMapping = {}
    this.options = {}
    this.animationFrame = null
  }

  private drawNodeBackground(node: SquarifiedModule) {
    const [x, y, w, h] = node.layout
    for (const child of node.children) {
      this.drawNodeBackground(child)
    }
    this.context.fillStyle = this.colorMapping[node.node.filename]
    if (node.children.length) {
      this.context.fillRect(x, y, w, STYLES.HEAD_HEIGHT)
      this.context.fillRect(x, y + h - STYLES.PADDING, w, STYLES.PADDING)
      this.context.fillRect(x, y + STYLES.HEAD_HEIGHT, STYLES.PADDING, h - STYLES.INSET_Y)
      this.context.fillRect(x + w - STYLES.PADDING, y + STYLES.HEAD_HEIGHT, STYLES.PADDING, h - STYLES.INSET_Y)
    } else {
      this.context.fillRect(x, y, w, h)
    }
  }

  private drawNodeForeground(node: SquarifiedModule) {
    const [x, y, w, h] = node.layout

    if (this.currentNode === node) {
      this.context.fillStyle = 'rgba(255,255,255,0.5)'
      this.context.fillRect(x, y, w, h)
    }

    this.context.strokeStyle = '#222'
    this.context.strokeRect(x + 0.5, y + 0.5, w, h)

    if (h > STYLES.HEAD_HEIGHT) {
      this.context.fillStyle = '#000'
      const maxWidth = w - STYLES.INSET_X
      const textY = y + Math.round(STYLES.INSET_Y / 2) - 2
      const ellipsisWidth = 3 * charCodeWidth(this.context, STYLES.DOT_CHAR_CODE)
      const [text, width] = textOverflowEllipsis(this.context, node.node.label, maxWidth, ellipsisWidth)
      const textX = x + Math.round((w - width) / 2)
      if (text) {
        this.context.font = '14px sans-serif'
        this.context.globalAlpha = 0.5
        if (node.children.length) {
          this.context.fillText(text, textX, textY)
        } else {
          const textY = y + Math.round(h / 2)
          this.context.fillText(text, textX, textY)
        }
        this.context.globalAlpha = 1
      }

      for (const child of node.children) {
        this.drawNodeForeground(child)
      }
    }
  }

  private smoothDrawing() {
    if (!this.animationFrame) {
      this.animationFrame = window.requestAnimationFrame(() => {
        this.draw()
      })
    }
  }

  private draw() {
    this.animationFrame = null
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.context.textBaseline = 'middle'
    for (const node of this.layoutNodes) {
      this.drawNodeBackground(node)
    }
    for (const node of this.layoutNodes) {
      this.drawNodeForeground(node)
    }
  }

  private eventHandler<T extends MouseEvent | WheelEvent>(
    e: T,
    handler: (event: PaintEvent<T>) => void
  ) {
    const layout = findRelativeNode(this.canvas, e, this.layoutNodes)
    const event = {
      nativeEvent: e,
      module: layout
    }
    handler(event)
  }

  private changeHoverNode(node: SquarifiedModule | null) {
    if (this.currentNode !== node) {
      this.currentNode = node
      this.smoothDrawing()
    }
  }

  private setupColorMapping() {
    const assignColorByDirectory = (module: Module, hue: number, depth: number) => {
      this.colorMapping[module.filename] = hueAngleToColor(hue, depth)
      if (module.groups) {
        for (const child of module.groups) {
          assignColorByDirectory(child, hue, depth + 1)
        }
      }
    }
    for (const module of this.data) {
      assignColorByDirectory(module, evaluateHueFromModule(module), 0)
    }
  }

  zoom(node: PaintEvent<MouseEvent | WheelEvent>) {
  }

  dispose() {
    if (!this.mainEl) return
    this.mainEl.removeChild(this.canvas)
    this.canvas = null!
    this.context = null!
    this.currentNode = null
    this.shape = { ...defaultShape }
    this.data = []
    this.layoutNodes = []
    this.colorMapping = {}
    this.animationFrame = null
  }

  resize() {
    if (!this.mainEl) return
    const prviousShape = { ...this.shape }
    const ratio = window.devicePixelRatio || 1
    const w = this.mainEl.clientWidth
    const h = window.innerHeight
    this.shape = { width: w, height: h }
    this.canvas.width = Math.round(w * ratio)
    this.canvas.height = Math.round(h * ratio)
    this.canvas.style.cssText = `width: ${w}px; height: ${h}px`
    this.context.scale(ratio, ratio)
    if (w !== prviousShape.width || h !== prviousShape.height) {
      this.layoutNodes = squarify(
        this.data,
        STYLES.PADDING,
        STYLES.PADDING,
        this.shape.width - STYLES.INSET_X,
        this.shape.height - STYLES.INSET_X
      )
    }
    this.draw()
  }

  mount(element: HTMLElement) {
    this.mainEl = element
    this.setupColorMapping()
    this.resize()
    element.appendChild(this.canvas)
    this.canvas.onmousemove = (e) =>
      this.eventHandler(e, (evt) => {
        this.canvas.style.cursor = 'pointer'
        if (evt.module) this.changeHoverNode(evt.module)
        this.options.onMousemove?.call(this, evt)
      })
    this.canvas.onclick = (e) =>
      this.eventHandler(e, (evt) => {
        this.canvas.style.cursor = 'default'
        this.options.onClick?.call(this, evt)
      })
    this.canvas.onwheel = (e) =>
      this.eventHandler(e, (evt) => {
        e.preventDefault()
        this.options.onMouseWheel?.call(this, evt)
      })
    this.canvas.onmouseout = () => this.changeHoverNode(null)
  }

  setup(options: PaintOptions) {
    this.options = options
  }
}

export function createTreemap(manifest: Module[]) {
  const panit = new Paint(manifest)
  return panit
}
