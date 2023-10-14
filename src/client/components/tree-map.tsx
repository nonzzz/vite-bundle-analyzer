import React, { useEffect,  useMemo, useRef } from 'react'
import style9 from 'style9'
import { FoamTree } from '@carrotsearch/foamtree'
import { useApplicationContext } from '../context'
import { Foam, Sizes } from '../interface'

const styles = style9.create({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative'
  }
})

interface TitleBarDecoratorVariables {
  titleBarText?: string
  titleBarShown: boolean
}

interface VisibleFoam extends Foam{
  weight: number
}

function travseVisibleModule(foamModule: Foam, sizes: Sizes): VisibleFoam {
  if (foamModule.groups)  foamModule.groups = foamModule.groups.map((module) => travseVisibleModule(module, sizes))
  return { ...foamModule, weight: foamModule[sizes] }
}

export function TreeMap() {
  const { foamModule, sizes } = useApplicationContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const foamTreeInstance = useRef<any>(null)

  // travseVisibleModule(foamModule, sizes)
  const visibleChunks = useMemo(() => foamModule.map((module) => travseVisibleModule(module, sizes)), [foamModule, sizes])

  useEffect(() => {
    if (!foamTreeInstance.current) {
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
        titleBarDecorator(_, __, variables: TitleBarDecoratorVariables) {
          variables.titleBarShown = false
        }
      })
    }
    return () => {
      foamTreeInstance.current.dispose()
      foamTreeInstance.current = null
    }
  }, [visibleChunks])

  return <div className={styles('container')} ref={containerRef} />
}
