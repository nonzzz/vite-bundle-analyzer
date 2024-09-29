import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useApplicationContext } from '../../context'
import { Treemap } from './component'
import type { TreemapComponentInstance } from './component'
import { DuckModule, wrapperAsModule } from './squarify'
import { Module } from './interface'

export interface TreemapProps {
  onMousemove: (data: any) => void
}

export const TreemapV2 = forwardRef((props: TreemapProps, ref) => {
  const instance = useRef<TreemapComponentInstance>()
  const { analyzeModule, sizes, scence } = useApplicationContext()

  useImperativeHandle(ref, () => instance.current!)

  // @ts-expect-error
  const visibleChunks = useMemo<DuckModule<Module>>(() => {
    return analyzeModule.filter(m => scence.has(m.label)).map(m => {
      const { stats, source, ...rest } = m
      const groups = sizes === 'statSize' ? stats : source
      return wrapperAsModule({ ...rest, groups }, sizes)
    })
  }, [analyzeModule, scence, sizes])

  return <Treemap ref={(c) => instance.current = c!} options={{ data: visibleChunks, evt: { mousemove: props.onMousemove } }} />
})
