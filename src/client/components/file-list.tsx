import { useMemo, useState } from 'react'
import { Checkbox, Spacer } from '@geist-ui/core'
import style9 from 'style9'
import { convertBytes, noop } from '../shared'
import type { Foam, Sizes } from '../interface'

export interface FileListProps<F> {
  files: F[]
  extra: Sizes
  scence: Set<string>
  onChange(values: string[]): void
}

const styles = style9.create({
  container: {
    width: '320px',
    overflow: 'hidden'
  },
  text: {
    maxWidth: '300px',
    marginRight: '5px'
  }
})

export function FileList<F extends Foam>(props: FileListProps<F>) {
  const { scence, files: userFiles, extra = 'statSize', onChange = noop } = props
  const [checkAll, setCheckAll] = useState<boolean>(() => scence.size === userFiles.length)

  const files = useMemo(() => userFiles.map((file) => ({ name: file.id, extra: convertBytes(file[extra]) })), [userFiles, extra])

  const groupValues = useMemo(() => {
    if (checkAll) return userFiles.map(v => v.id)
    if (scence.size) return [...scence]
    return []
  }, [checkAll, scence, userFiles])

  return (
    <div className={styles('container')}>
      <div>
        <Checkbox
          font="14px"
          scale={0.85}
          checked={checkAll}
          value="All"
          onChange={(event) => {
            const state = event.target.checked
            onChange(state ? userFiles.map(v => v.id) : [])
            setCheckAll(state)
          }}
        >
          <span className={styles('text')}>All</span>
        </Checkbox>
        <Spacer h={0.5} />
      </div>
      <Checkbox.Group font="14px" scale={0.85} value={groupValues} onChange={onChange}>
        {files.map(file => (
          <div key={file.name}>
            <Checkbox value={file.name}>
              <span className={styles('text')}>{file.name}</span>
              {file.extra}
            </Checkbox>
            <Spacer h={0.5} />
          </div>
        ))}
      </Checkbox.Group>
    </div>
  )
}
