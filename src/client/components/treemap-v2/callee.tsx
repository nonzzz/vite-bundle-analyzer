import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useApplicationContext } from '../../context'
import { Treemap } from './component'
import type { TreemapComponentInstance } from './component'
import { wrapperAsModule } from './squarify'
import { PaintEventMap } from './treemap'

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
  }, [analyzeModule, scence, sizes])

  return <Treemap ref={(c) => instance.current = c!} options={{ data: visibleChunks, evt: { mousemove: props.onMousemove } }} />
})
