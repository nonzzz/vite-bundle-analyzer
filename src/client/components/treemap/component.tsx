import { Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { c2m, createTreemap, defaultFontOptions, defaultLayoutOptions, sortChildrenByKey } from 'squarified'
import type { ColorMappings, NativeModule, PrimitiveEventCallback, RenderDecorator, TreemapLayout } from 'squarified'
import { hashCode } from '../../shared'
import { useApplicationContext } from '../../context'

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export interface TreemapProps {
  onMousemove: PrimitiveEventCallback<'mousemove'>
}

function evaluateColorMappings(data: NativeModule[]): ColorMappings {
  const colorMappings: ColorMappings = {}

  const hashToHue = (id: string): number => {
    const hash = Math.abs(hashCode(id))
    return hash % 360
  }

  const lightScale = (depth: number) => 70 - depth * 5
  const baseSaturation = 40
  const siblingHueShift = 20

  const rc = 0.2126
  const gc = 0.7152
  const bc = 0.0722

  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    }
    return { r: f(0), g: f(8), b: f(4) }
  }

  const calculateLuminance = (r: number, g: number, b: number): number => {
    return rc * r + gc * g + bc * b
  }

  const calculateColor = (
    module: NativeModule,
    depth: number,
    parentHue: number | null,
    siblingIndex: number,
    totalSiblings: number
  ) => {
    const nodeHue = hashToHue(module.id)
    const hue = parentHue !== null
      ? (parentHue + siblingHueShift * siblingIndex / totalSiblings) % 360
      : nodeHue
    const lightness = lightScale(depth)

    const hslColor = {
      h: hue,
      s: baseSaturation,
      l: lightness / 100
    }
    const { r, g, b } = hslToRgb(hslColor.h, hslColor.s / 100, hslColor.l)
    const luminance = calculateLuminance(r, g, b)

    if (luminance < 0.6) {
      hslColor.l += 0.2
    } else if (luminance > 0.8) {
      hslColor.l -= 0.1
    }

    hslColor.l *= 100

    colorMappings[module.id] = {
      mode: 'hsl',
      desc: hslColor
    }

    if (module.groups && Array.isArray(module.groups)) {
      const totalChildren = module.groups.length
      for (let i = 0; i < totalChildren; i++) {
        const child = module.groups[i]
        calculateColor(child, depth + 1, hue, i, totalChildren)
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    const module = data[i]
    calculateColor(module, 0, null, i, data.length)
  }

  return colorMappings
}

function layoutDecorator(app: TreemapLayout) {
  const decorator: RenderDecorator = {
    font: defaultFontOptions,
    layout: defaultLayoutOptions,
    color: { mappings: evaluateColorMappings(app.data) }
  }
  Object.assign(app.decorator, decorator)
}

export const Treemap = forwardRef((props: TreemapProps, ref: Ref<TreemapComponentInstance>) => {
  const root = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<TreemapComponentInstance>()
  const { analyzeModule, sizes, scence } = useApplicationContext()

  const visibleChunks = useMemo(() => {
    const filtered = analyzeModule.filter((m) => scence.has(m.label))
    const sortedData = sortChildrenByKey(
      filtered.map(
        (item) => c2m({ ...item, groups: sizes === 'statSize' ? item.stats : item.source }, sizes, (d) => ({ ...d, id: d.label }))
      ),
      'weight'
    )
    return sortedData
  }, [analyzeModule, scence, sizes])

  useEffect(() => {
    const el = root.current
    if (el) {
      const observer = new ResizeObserver(() => {
        instanceRef.current?.resize()
      })
      observer.observe(el)
      return () => {
        observer.unobserve(el)
        observer.disconnect()
      }
    }
    return noop
  }, [])

  useImperativeHandle(ref, () => instanceRef.current!)

  const callbackRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      // element is mounted
      instanceRef.current = createTreemap()
      instanceRef.current.use('decorator', layoutDecorator)
      instanceRef.current.init(el)
    } else {
      // element is unmounted
      instanceRef.current?.dispose()
      instanceRef.current = undefined
    }
    root.current = el
  }, [])

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setOptions({ data: visibleChunks })
    }
  }, [visibleChunks])

  useEffect(() => {
    instanceRef.current?.on('click', function(metadata) {
      this.zoom(metadata.module)
    })
  }, [])

  useEffect(() => {
    instanceRef.current?.on('mousemove', props.onMousemove)
  }, [props])

  return <div ref={callbackRef} {...inline({ height: '100%', width: '100%', position: 'relative' })} />
})
