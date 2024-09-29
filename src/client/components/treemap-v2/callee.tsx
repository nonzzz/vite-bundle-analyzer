import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useApplicationContext } from '../../context'
import { Treemap } from './component'
import type { TreemapComponentInstance } from './component'
import { sortChildrenBySize, wrapperAsModule } from './squarify'
import type { PaintEventMap } from './treemap'

export interface TreemapProps {
  onMousemove: PaintEventMap['mousemove']
}

export const TreemapV2 = forwardRef((props: TreemapProps, ref) => {
  const instance = useRef<TreemapComponentInstance>()
  const { analyzeModule, sizes, scence } = useApplicationContext()

  useImperativeHandle(ref, () => instance.current!)

  const visibleChunks = useMemo(() => {
    return analyzeModule.filter(m => scence.has(m.label)).map(m => {
      const { stats, source, ...rest } = m
      const groups = sizes === 'statSize' ? stats : source
      return wrapperAsModule({ ...rest, groups }, sizes)
    })
      .sort(sortChildrenBySize)
  }, [analyzeModule, scence, sizes])

  const eventMap = useMemo(() => {
    return {
      mousemove: props.onMousemove
    }
  }, [props.onMousemove])

  const options = useMemo(() => {
    return { data: visibleChunks, evt: eventMap }
  }, [visibleChunks, eventMap])

  return <Treemap ref={(c) => instance.current = c!} options={options} />
})
