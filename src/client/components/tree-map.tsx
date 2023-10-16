import React, { useCallback, useEffect,  useMemo, useRef, useState } from 'react'
import style9 from 'style9'
import { FoamTree } from '@carrotsearch/foamtree'
import type { FoamContext } from '@carrotsearch/foamtree'
import { useApplicationContext } from '../context'
import type { Foam, Sizes } from '../interface'
import { hashCode } from '../shared'


type FoamGroup = Omit<Foam, 'groups'> & {isAsset?: boolean}

const styles = style9.create({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative'
  }
})

interface VisibleFoam extends Foam{
  weight: number
}

function travseVisibleModule(foamModule: Foam, sizes: Sizes): VisibleFoam {
  if (foamModule.groups)  foamModule.groups = foamModule.groups.map((module) => travseVisibleModule(module, sizes))
  return { ...foamModule, weight: foamModule[sizes] }
}

// We using keyword `isAsset` to judge the group root 
function findGroupRoot(group: FoamGroup, foamContext: FoamContext): FoamGroup {
  if (group.isAsset) return group
  while (!group.isAsset) {
    const prop = foamContext.get<{parent: Foam}>('hierarchy', group)!
    return findGroupRoot(prop.parent, foamContext)
  }
  return group
}

function getChunkNamePart(chunkLabel: string, chunkNamePartIndex: number) {
  return chunkLabel.split(/[^a-z0-9]/iu)[chunkNamePartIndex] || chunkLabel
}

export function TreeMap() {
  const { foamModule, sizes } = useApplicationContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const foamTreeInstance = useRef<FoamTree | null>(null)

  const [chunkNamePartIndex, setChunkNamePartIndex] = useState<number>(0)

  const visibleChunks = useMemo(() => foamModule.map((module) => travseVisibleModule(module, sizes)), [foamModule, sizes])


  const findChunkNamePartIndex = useCallback(() => {
    const splitChunkNames = visibleChunks.map((chunk) => chunk.label.split(/[^a-z0-9]/iu))
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
    setChunkNamePartIndex(namePart.index)
  }, [visibleChunks])

  useEffect(findChunkNamePartIndex, [chunkNamePartIndex, findChunkNamePartIndex])

  useEffect(() => {
    if (!foamTreeInstance.current && containerRef.current) {
      foamTreeInstance.current = new FoamTree({
        element: containerRef.current,
        layout: 'squarified',
        stacking: 'flattened',
        pixelRatio: window.devicePixelRatio || 1,
        maxGroups: Infinity,
        maxGroupLevelsDrawn: Infinity,
        maxGroupLabelLevelsDrawn: Infinity,
        maxGroupLevelsAttached: Infinity,
        wireframeLabelDrawing: 'always',
        groupMinDiameter: 0,
        groupLabelVerticalPadding: 0.2,
        rolloutDuration: 0,
        pullbackDuration: 0,
        fadeDuration: 0,
        groupExposureZoomMargin: 0.2,
        zoomMouseWheelDuration: 300,
        openCloseDuration: 200,
        dataObject: {
          groups: visibleChunks
        },
        titleBarDecorator(_, __, variables) {
          variables.titleBarShown = false
        },
        groupColorDecorator(_, properties, variables) {
          if (!foamTreeInstance.current) return
          const root = findGroupRoot(properties.group, foamTreeInstance.current)
          const chunkName =  getChunkNamePart(root.label, chunkNamePartIndex)
          const hash = /[^0-9]/.test(chunkName) ? hashCode(chunkName) : (parseInt(chunkName) / 1000) * 360
          variables.groupColor = {
            model: 'hsla',
            h: Math.round(Math.abs(hash) % 360),
            s: 60,
            l: 50,
            a: 0.9
          }
        }
      })
    }
    return () => {
      if (foamTreeInstance.current) {
        // 
      }
      // foamTreeInstance.current.dispose()
      // foamTreeInstance.current = null
    }
  }, [visibleChunks, chunkNamePartIndex])

  return <div className={styles('container')} ref={containerRef} />
}
