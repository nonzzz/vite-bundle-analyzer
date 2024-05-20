// According the bundle analyzed size. I deiced to implement the treemap component to replace Moduletree component.
// Alough the Moduletree component is more powerful and has more features, but it's too large to be used in the project.
// The treemap component is a simple component that can be used to display the data in a treemap format.

// Thanks Squarified Treemap by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
// https://www.win.tue.nl/~vanwijk/stm.pdf

import type { Module } from './interface'

interface Shape {
  width: number
  height: number
}

// Before handle the treemap we should bind all colors

const defaultShape = { width: 0, height: 0 }

export class Paint {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private shape: Shape
  private mainEl: HTMLElement | null
  private data: Module[]
  private layoutNodes: Module[]
  private colorMapping: Record<string, string>
  constructor(data: Module[]) {
    this.mainEl = null
    this.data = data
    this.layoutNodes = []
    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')!
    this.shape = { ...defaultShape }
  }
 
  private draw() {
    // cleanup layout
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private updateColorMapping() {
    const root: Record<string, string> = {
    }
    const colorMapping: Record<string, string> = {}
    const accumulatePath = (node: Module, path: string = '') => {
      path += node.id + '/'
      root[path.substring(0, path.length - 1)] = ''
      if (!node.groups) return
      // console.log(node.groups.sort(sortChildrenBySize))
      for (const group of node.groups) {
        accumulatePath(group, path)
      }
    }

    for (const arcana of this.data) {
      for (const group of arcana.groups) {
        accumulatePath(group)
      }
    }
    // assign color
    console.log(this.data)
  }

  dispose() {
    if (!this.mainEl) return
    this.mainEl.removeChild(this.canvas)
    this.canvas = null!
    this.context = null!
    this.shape = { ...defaultShape }
    this.data = []
    this.layoutNodes = []
    this.colorMapping = {}
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
      // this.layoutNodes = squarify(this.data, 0, 0, this.shape.width - 1, this.shape.height - 1)
      // squarify(this.data, 0, 0, this.shape.width - 1, this.shape.height - 1)
    }
    this.draw()
  }

  mount(element: HTMLElement) {
    this.mainEl = element
    this.updateColorMapping()
    this.resize()
    element.appendChild(this.canvas)
  }
}

// manifest is the processed Module module but it's only a temporary data struct.
// It will be re desgined after squarify algorithm is implemented.
// In past we used @carrotsearch/Moduletree it neeed Module struct. But now we won't use it anymore.

export function createTreemap(manifest: Module[]) {
  const panit = new Paint(manifest)
  return panit
}
