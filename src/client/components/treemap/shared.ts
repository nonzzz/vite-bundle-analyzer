import { hashCode } from '../../shared'
import type { Module, SquarifiedModule } from './interface'

export function sortChildrenBySize(a: Module, b: Module) {
  return b.size - a.size || +(a.id > b.id) - +(a.id < b.id)
}

export function hueAngleToColor(hue: number, depth: number) {
  const saturation = 60 - depth * 5
  const lightness = 50 + depth * 5
  return `hsla(${hue}deg, ${Math.max(saturation, 30)}%, ${Math.min(lightness, 70)}%, 0.9)`
}

export function evaluateHueFromModule(module: Module) {
  const { filename } = module
  const arc = Math.PI * 2
  const isNumeric = (s: string) => {
    const cp = s.charCodeAt(0)
    return cp >= 48 && cp <= 57
  }
  const hash = isNumeric(filename) ? (parseInt(filename) / 1000) * arc : hashCode(filename)
  return Math.round(Math.abs(hash) % arc)
}

export const STYLES = {
  PADDING: 5,
  HEAD_HEIGHT: 20,
  INSET_X: 10,
  INSET_Y: 20 + 5,
  DOT_CHAR_CODE: 46,
  ANIMATION_DURATION: 300
}

export function charCodeWidth(c: CanvasRenderingContext2D, ch: number) {
  return c.measureText(String.fromCharCode(ch)).width
}

export function textOverflowEllipsis(c: CanvasRenderingContext2D, text: string, width: number, ellipsisWidth: number): [string, number] {
  if (width < ellipsisWidth) {
    return ['', 0]
  }
  let textWidth = 0
  let i = 0
  while (i < text.length) {
    const charWidth = charCodeWidth(c, text.charCodeAt(i))
    if (width < textWidth + charWidth + ellipsisWidth) {
      return [text.slice(0, i) + '...', textWidth + ellipsisWidth]
    }
    textWidth += charWidth
    i++
  }
  return [text, textWidth]
}

export function findRelativeNode(
  canvas: HTMLCanvasElement,
  mouseEvent: MouseEvent,
  layoutNodes: SquarifiedModule[]
): SquarifiedModule | null {
  let { pageX: mouseX, pageY: mouseY } = mouseEvent
  for (let el: HTMLElement | null = canvas; el; el = el.offsetParent as HTMLElement | null) {
    mouseX -= el.offsetLeft
    mouseY -= el.offsetTop
  }
  const visit = (nodes: SquarifiedModule[]): SquarifiedModule | null => {
    if (!nodes) return null
    for (const node of nodes) {
      const [x, y, w, h] = node.layout
      if (mouseX >= x && mouseY >= y && mouseX < x + w && mouseY < y + h) {
        return visit(node.children) || node
      }
    }
    return null
  }

  return visit(layoutNodes)
}
