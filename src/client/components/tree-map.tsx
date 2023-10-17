import React, { useEffect,  useMemo, useRef, useState } from 'react'
import style9 from 'style9'
import { FoamTree } from '@carrotsearch/foamtree'
import { Spacer, Text } from '@geist-ui/core'
import type { FoamContext, FoamDataObject, FoamEventObject  } from '@carrotsearch/foamtree'
import { useApplicationContext } from '../context'
import type { Foam, Sizes } from '../interface'
import { convertBytes, hashCode } from '../shared'
import { Tooltip } from './tooltip'


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
  if (foamModule.groups) foamModule.groups = foamModule.groups.map((module) => travseVisibleModule(module, sizes))
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

function ModuleSize(props: {module: FoamDataObject, sizes: Sizes, checkedSizes: Sizes}) {
  const { module, sizes, checkedSizes } = props
  if (!module[sizes]) return null
  return <Text p font='12px'>
    {checkedSizes === sizes ? <Text span b font='12px'>{sizes}</Text> : <Text span>{sizes}</Text>} : <Text b font='12px'>{convertBytes(module[sizes])}</Text>
  </Text>
}

export function TreeMap() {
  const { foamModule, sizes, scence, drawerVisible } = useApplicationContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const foamTreeInstance = useRef<FoamTree | null>(null)
  const [visible, setVisible] = useState<boolean>(false)
  const [module, setModule] = useState<FoamDataObject | null>(null)
  const zoomOutDisabled = useRef<boolean>(false)

  const visibleChunks = useMemo(() => foamModule.filter((v) => scence.has(v.id)).map((module) => travseVisibleModule(module, sizes)), [foamModule, sizes, scence])

  const chunkNamePartIndex = useMemo(() => {
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
    return namePart.index
  }, [visibleChunks])


  const resize = () => {
    if (!foamTreeInstance.current) return 
    foamTreeInstance.current.resize()
  }

  const handleGroupHover = (event: FoamEventObject) => {
    const { group } = event
    if (!group) return setVisible(false)
    setVisible(true)
    setModule(() => group)
  }

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
          const root =  findGroupRoot(properties.group, foamTreeInstance.current)
          const chunkName =  getChunkNamePart(root.label, chunkNamePartIndex)
          const hash = /[^0-9]/.test(chunkName) ? hashCode(chunkName) : (parseInt(chunkName) / 1000) * 360
          variables.groupColor = {
            model: 'hsla',
            h: Math.round(Math.abs(hash) % 360),
            s: 60,
            l: 50,
            a: 0.9
          }
        },
        onGroupDoubleClick(event) {
          event.preventDefault()
        },
        onGroupClick(event) {
          event.preventDefault()
          zoomOutDisabled.current = false
          this.zoom(event.group)
        },
        onGroupHover(event) {
          if (event.group && (event.group.attribution || event.group === this.get<FoamDataObject>('dataObject'))) {
            event.preventDefault()
            setVisible(false)
            return
          }
          handleGroupHover(event)
        },
        onGroupMouseWheel(event) {
          const { scale } = this.get<{scale: number}>('viewport')!
          const isZoomOut = event.delta < 0
          if (isZoomOut) {
            if (zoomOutDisabled.current) return event.preventDefault()
            if (scale < 1) {
              zoomOutDisabled.current = true
              event.preventDefault()
            }
            return
          }
          zoomOutDisabled.current = false
        }
      })
    }
    window.addEventListener('resize', resize)
    return () => {
      if (!foamTreeInstance.current) return
      foamTreeInstance.current.dispose()
      foamTreeInstance.current = null
      window.removeEventListener('resize', resize)
    }
  }, [chunkNamePartIndex, visibleChunks])

  useEffect(() => {
    if (!scence.size) setVisible(false)
    if (drawerVisible) setVisible(false)
  }, [scence, drawerVisible])

  return <>
    <div className={styles('container')} ref={containerRef} />
    <Tooltip visible={visible}>
      {module && <div>
        <Text p b font='14px'>{module.label}</Text>
        <Spacer h={0.5} />
        <ModuleSize module={module} sizes={'statSize'} checkedSizes={sizes} />
        <ModuleSize module={module} sizes={'parsedSize'} checkedSizes={sizes} />
        <ModuleSize module={module} sizes={'gzipSize'} checkedSizes={sizes} />
        <Text>
          path: {module.id}
        </Text>
      </div>}
    </Tooltip>
  </>
}
