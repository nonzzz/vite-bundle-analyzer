import React, { useEffect, useMemo, useRef } from 'react'
import style9 from 'style9'
import { FoamTree } from '@carrotsearch/foamtree'
import { omit } from '../shared'
import { useApplicationContext } from '../context'

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

export function TreeMap() {
  const { foramModule } = useApplicationContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const foamTreeInstance = useRef<any>(null)

  // const mockPretty = useMemo(() => {
  //   return prettyModule.map((item) => {
  //     const latest = omit(item, ['children'])
  //     latest.groups = item.children.flatMap(child => {
  //       return  Object.entries(child).map(([subDir, node]) => ({
  //         label: subDir,
  //         groups: node.map(s => ({ label: s.id }))
  //       }))
  //     })
  //     return latest
  //   })
  // }, [prettyModule])

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
          groups: foramModule
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
  }, [foramModule])

  return <div className={styles('container')} ref={containerRef} />
}
