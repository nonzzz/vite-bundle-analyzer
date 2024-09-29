// Thanks Squarified Treemap by Mark Bruls, Kees Huizing, and Jarke J. van Wijk
// https://www.win.tue.nl/~vanwijk/stm.pdf

// note: we handle the module at server side and do the sorted.
// so we no need to sort the module at client side. (unlike the original squarify algorithm)

import type { Sizes } from '../../interface'

export type DuckModule<T> = Record<string, any> & { groups: T[] }

// steps: recursive splitting.
// 1. find the shortest side of the rectangle.
// 2. combine the next element to the current row until the aspect ratio is the closest to 1.
// 3. repeat step 2 until all elements are placed.

// export function squarify<T extends Module>(data: T[], x: number, y: number, w: number, h: number) {
//   const result: any[] = []
//   if (!data) return result

//   // evaluate the highest aspect ratio of a list of rectangles.
//   const worst = (start: number, end: number, shortestSide: number, totalSize: number, sizeToArea: number) => {
//     const maxArea = data[start].size * sizeToArea
//     const minArea = data[end].size * sizeToArea
//     return Math.max((shortestSide ** 2) * maxArea / (totalSize ** 2), (totalSize ** 2) / ((shortestSide ** 2) * minArea))
//   }

//   const recursion = (start: number, x: number, y: number, w: number, h: number) => {
//     while (start < data.length) {
//       let totalSize = 0
//       for (let i = start; i < data.length; i++) {
//         totalSize += data[i].size
//       }
//       const shortestSide = Math.min(w, h)
//       const sizeToArea = (w * h) / totalSize
//       let end = start
//       let areaInRun = 0
//       let oldWorst = 0

//       while (end < data.length) {
//         const area = data[end].size * sizeToArea
//         const newWorst = worst(start, end, shortestSide, areaInRun + area, sizeToArea)
//         if (end > start && oldWorst < newWorst) break
//         areaInRun += area
//         oldWorst = newWorst
//         end++
//       }
//       const split = Math.round(areaInRun / shortestSide)
//       let areaInLayout = 0

//       for (let i = start; i < end; i++) {
//         const node = data[i]
//         const area = node.size * sizeToArea
//         const lower = Math.round(shortestSide * areaInLayout / areaInRun)
//         const upper = Math.round(shortestSide * (areaInLayout + area) / areaInRun)
//         const [cx, cy, cw, ch] = w >= h
//           ? [x, y + lower, split, upper - lower]
//           : [x + lower, y, upper - lower, split]
//         const { groups, ...rest } = node
//         result.push({
//           node: rest,
//           layout: [cx, cy, cw, ch],
//           // @ts-expect-error
//           children: squarify(groups, cx, cy, cw, ch)
//         })
//         areaInLayout += area
//       }

//       start = end

//       if (w >= h) {
//         x += split
//         w -= split
//       } else {
//         y += split
//         h -= split
//       }
//     }
//   }

//   recursion(0, x, y, w, h)
//   return result
// }

// proedure: squarify(list of real children, list of real row, real w)
// begin:
//    real c = head(children);
//    if worst(row, w) <= worst(row ++ [c], w) then
//       squarify((tail(children), row ++ [c], w)
//    else
//       layoutrow(row);
//       squarify(children, [], width())
//    if
// end

export function sortChildrenBySize<T extends DuckModule<T>>(
  a: T,
  b: T,
  condtion: string = 'size',
  fallbackCondition: string = 'id'
) {
  return b[condtion] - a[condtion] || +(a[fallbackCondition] > b[fallbackCondition]) - +(a[fallbackCondition] < b[fallbackCondition])
}

export function flattenModules<
  T extends DuckModule<T>,
  K extends Omit<T, 'groups'> = any
>(
  data: T[]
): K[] {
  const result: Omit<T, 'groups'>[] = []
  for (let i = 0; i < data.length; i++) {
    const { groups, ...rest } = data[i]
    result.push(rest)
    if (groups) {
      result.push(...flattenModules(groups))
    }
  }
  return result as K[]
}

export function wrapperAsModule<T extends DuckModule<T>>(data: T, sizes: Sizes) {
  if (Array.isArray(data.groups)) {
    data.groups = data.groups.map((m) => wrapperAsModule(m as T, sizes))
  }
  return { ...data, size: data[sizes] satisfies number }
}
