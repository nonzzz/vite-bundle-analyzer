import stylex from '@stylexjs/stylex'
import { useMemo } from 'react'
import type { Module, Sizes } from '../interface'
import { Checkbox } from './checkbox'
import type { CheckboxEvent } from './checkbox'
import { ModuleItem } from './module-item'
import { Spacer } from './spacer'

export interface FileListProps<F> {
  files: F[]
  extra: Sizes
  scence: Set<string>

  onChange: (values: string[]) => void
}

const styles = stylex.create({
  baseline: {
    ':not(#_) > div': {
      alignItems: 'baseline'
    }
  }
})

export function FileList<F extends Module>(props: FileListProps<F>) {
  const { scence, files: userFiles, extra = 'statSize', onChange } = props

  const [all, ...files] = useMemo(
    () =>
      userFiles
        .reduce((acc, file) => {
          const meta = { name: file.label, extra: file[extra] }
          acc[0].extra += meta.extra
          acc.push(meta)
          return acc
        }, [{ name: 'All', extra: 0 }] as { name: string, extra: number }[]),
    [userFiles, extra]
  )

  const checkAll = useMemo(
    () => userFiles.length === scence.size,
    [scence, userFiles]
  )

  const groupValues = useMemo(() => {
    if (checkAll) { return userFiles.map((v) => v.label) }
    return Array.from(scence)
  }, [checkAll, scence, userFiles])

  const handleChange = (e: CheckboxEvent) => {
    const { checked } = e.target
    onChange(checked ? userFiles.map((v) => v.label) : [])
  }
  return (
    <div
      stylex={{
        overflow: 'hidden'
      }}
    >
      <ModuleItem name={all.name} size={all.extra} {...stylex.props(styles.baseline)}>
        <Checkbox
          value={all.name}
          font="14px"
          scale={0.85}
          checked={checkAll}
          onChange={handleChange}
        />
      </ModuleItem>
      <Spacer h={0.75} />
      <Checkbox.Group font="14px" scale={0.85} value={groupValues} onChange={onChange}>
        {files.map((file) => (
          <ModuleItem name={file.name} size={file.extra} key={file.name} {...stylex.props(styles.baseline)}>
            <Checkbox value={file.name} />
          </ModuleItem>
        ))}
      </Checkbox.Group>
    </div>
  )
}
