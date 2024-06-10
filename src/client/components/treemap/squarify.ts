import { STYLES } from './shared'
import type { Module, SquarifiedModule } from './interface'

// Thanks Squarified Treemap by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
// https://www.win.tue.nl/~vanwijk/stm.pdf
function recursion<T extends Module>(data: T[], x: number, y: number, w: number, h: number): SquarifiedModule[] {
  const squarifiedData: SquarifiedModule[] = []
  if (!data) return squarifiedData
  const worst = (start: number, end: number, shortSide: number, totalSizes: number, sizeToArea: number) => {
    const first = data[start]
    const last = data[end]
    const maxArea = first.size * sizeToArea
    const minArea = last.size * sizeToArea
    return Math.max(
      ((shortSide ** 2) * maxArea) / (totalSizes ** 2),
      (totalSizes * totalSizes) / ((shortSide ** 2) * minArea)
    )
  }

  const squarify = (start: number, x: number, y: number, w: number, h: number) => {
    while (start < data.length) {
      let totalSizes = 0
      for (let i = start; i < data.length; i++) {
        totalSizes += data[i].size
      }
      const shortSide = Math.min(w, h)
      const sizeToArea = (w * h) / totalSizes
      let end = start
      let areaInRun = 0
      let oldWorst = 0

      while (end < data.length) {
        const area = data[end].size * sizeToArea
        const newWorst = worst(start, end, shortSide, areaInRun + area, sizeToArea)
        if (end > start && oldWorst < newWorst) break
        areaInRun += area
        oldWorst = newWorst
        end++
      }
      const split = Math.round(areaInRun / shortSide)
      let areaInLayout = 0
      for (let i = start; i < end; i++) {
        const node = data[i]
        const area = node.size * sizeToArea
        const lower = Math.round(shortSide * areaInLayout / areaInRun)
        const upper = Math.round(shortSide * (areaInLayout + area) / areaInRun)
        const [cx, cy, cw, ch] = w >= h
          ? [x, y + lower, split, upper - lower]
          : [x + lower, y, upper - lower, split]
        const { groups, ...rest } = node
        squarifiedData.push({
          node: rest,
          layout: [cx, cy, cw, ch],
          children: cw > STYLES.INSET_X && ch > STYLES.INSET_Y
            ? recursion(groups, cx + STYLES.PADDING, cy + STYLES.HEAD_HEIGHT, cw - STYLES.INSET_X, ch - STYLES.INSET_Y)
            : []
        })
        areaInLayout += area
      }
      start = end
      if (w >= h) {
        x += split
        w -= split
      } else {
        y += split
        h -= split
      }
    }
  }
  squarify(0, x, y, w, h)
  return squarifiedData
}

export { recursion as squarify }
