import { Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { inline } from '@stylex-extend/core'
import { noop } from 'foxact/noop'
import { c2m, createTreemap, defaultFontOptions, defaultLayoutOptions, getNodeDepth, sortChildrenByKey } from 'squarified'
import type { ColorMappings, NativeModule, PrimitiveEventCallback, RenderDecorator, TreemapLayout } from 'squarified'
import { hashCode } from '../../shared'
import { useApplicationContext } from '../../context'

export type TreemapComponentInstance = ReturnType<typeof createTreemap>

export interface TreemapProps {
  onMousemove: PrimitiveEventCallback<'mousemove'>
}

function findBestChunkPartIndex(data: NativeModule[]) {
  const splitChunkNames = data.map((chunk) => chunk.id.split(/[^a-z0-9]/iu))
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
}

function getChunkNamePart(chunkLabel: string, chunkNamePartIndex: number) {
  return chunkLabel.split(/[^a-z0-9]/iu)[chunkNamePartIndex] || chunkLabel
}

function calculateColorByChunk(module: NativeModule, groupRootId: string, chunkPartIndex: number) {
  const colorMappings: ColorMappings = {}
  if (module.groups && Array.isArray(module.groups)) {
    for (const group of module.groups) {
      Object.assign(colorMappings, calculateColorByChunk(group, groupRootId, chunkPartIndex))
    }
  }
  const chunkName = getChunkNamePart(groupRootId, chunkPartIndex)
  const hash = /[^0-9]/.test(chunkName) ? hashCode(chunkName) : (parseInt(chunkName) / 1000) * 360
  const depth = getNodeDepth(module)
  const hue = (Math.round(Math.abs(hash) % 360) + depth * 15) % 360
  const saturation = 70 + (depth * 3) % 30
  const lightness = 60 + (depth * 2) % 20
  colorMappings[module.id] = {
    mode: 'hsl',
    desc: {
      h: hue,
      s: saturation,
      l: lightness
    }
  }
  return colorMappings
}

function evaluateColorMappings(data: NativeModule[]) {
  const colorMappings: ColorMappings = {}
  const chunkPartIndex = findBestChunkPartIndex(data)
  for (const module of data) {
    const groupRootId = module.id
    Object.assign(colorMappings, calculateColorByChunk(module, groupRootId, chunkPartIndex))
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
        (item) => c2m({ ...item, groups: sizes === 'statSize' ? item.stats : item.source }, sizes, (d) => ({ ...d, id: d.filename }))
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
