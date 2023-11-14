import { useMemo } from 'react'
import { Checkbox, Spacer, Text } from '@geist-ui/core'
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
    overflow: 'hidden'
  },
  textContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  text: {
    flex: '1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
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
      }, [{ name: 'All', extra: 0 }])
      .map(meta => ({ ...meta, extra: convertBytes(meta.extra) })),
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
      <div className={styles('textContainer')}>
        <Checkbox
          value={all.name}
          font="14px"
          scale={0.85}
          checked={checkAll}
          onChange={() => onChange(checkAll ? [] : userFiles.map(v => v.id))}
        />
        <div className={styles('text')}>{all.name}</div>
        <Text b>
          (
          {all.extra}
          )
        </Text>
      </div>
      <Spacer h={0.75} />
      <Checkbox.Group font="14px" scale={0.85} value={groupValues} onChange={onChange}>
        {files.map(file => (
          <span key={file.name}>
            <div className={styles('textContainer')}>
              <Checkbox value={file.name} />
              <div className={styles('text')}>{file.name}</div>
              <Text b>
                (
                {file.extra}
                )
              </Text>
            </div>
            <Spacer h={0.5} />
          </span>
        ))}
      </Checkbox.Group>
    </div>
  )
}
