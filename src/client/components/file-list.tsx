import { useMemo } from 'react'
import { Checkbox, Spacer } from '@geist-ui/core'
import style9 from 'style9'
import { noop } from '../shared'
import type { Foam, Sizes } from '../interface'
import { ModuleItem } from './module-item'

export interface FileListProps<F> {
  files: F[]
  extra: Sizes
  scence: Set<string>

  onChange(values: string[]): void
}

const styles = style9.create({
  container: {
    overflow: 'hidden'
  }
})

export function FileList<F extends Foam>(props: FileListProps<F>) {
  const { scence, files: userFiles, extra = 'statSize', onChange = noop } = props

  const [all, ...files] = useMemo(
    () => userFiles
      .reduce((acc, file) => {
        const meta = { name: file.id, extra: file[extra] }
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
    if (checkAll) return userFiles.map(v => v.id)
    return Array.from(scence)
  }, [checkAll, scence, userFiles])

  return (
    <div className={styles('container')}>
      <ModuleItem name={all.name} size={all.extra}>
        <Checkbox
          value={all.name}
          font="14px"
          scale={0.85}
          checked={checkAll}
          onChange={() => onChange(checkAll ? [] : userFiles.map(v => v.id))}
        />
      </ModuleItem>
      <Spacer h={0.75} />
      <Checkbox.Group font="14px" scale={0.85} value={groupValues} onChange={onChange}>
        {files.map(file => (
          <ModuleItem name={file.name} size={file.extra} key={file.name}>
            <Checkbox value={file.name} />
          </ModuleItem>
        ))}
      </Checkbox.Group>
    </div>
  )
}
