import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { c2m, sortChildrenByKey } from 'squarified'
import { useApplicationContext } from '../../context'
import { Treemap } from './component'
import type { TreemapComponentInstance } from './component'

export interface TreemapProps {
  onMousemove: any
}

export const TreemapV2 = forwardRef((props: TreemapProps, ref) => {
  const instance = useRef<TreemapComponentInstance>()
  const { analyzeModule, sizes, scence } = useApplicationContext()

  useImperativeHandle(ref, () => instance.current!)

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
    if (visibleChunks.length && instance.current) {
      instance.current.setOptions({ data: visibleChunks })
      instance.current.on('mousemove', props.onMousemove)
      instance.current.on('click', function(metadata) {
        this.zoom(metadata.module)
      })
    }
  }, [visibleChunks, props.onMousemove])

  return <Treemap ref={(c) => instance.current = c!} />
})
