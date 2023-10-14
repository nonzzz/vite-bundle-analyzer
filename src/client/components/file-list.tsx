import React, { useMemo } from 'react'
import { Tree } from '@geist-ui/core'
import type { TreeProps } from '@geist-ui/core'
import { convertBytes } from '../shared'
import type { Foam, Sizes } from '../interface'

type TreeFile = NonNullable<TreeProps['value']>


type TreeFileItem = TreeFile[number]

export interface FileListProps<F> {
    files: F[]
    initialExpand?: boolean
    extra: Sizes
}

const traverseFile = <F extends typeof window['foamModule'][number], >(directory: string, files: F[], extra: Sizes) => {
  if (!files.length) return []
  const baseDirecotry: TreeFileItem = {
    type: 'directory',
    name: directory,
    extra: convertBytes(files.reduce((acc, cur) => acc += cur.statSize, 0))
  }

  baseDirecotry.files = files.map<TreeFileItem>((file) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return { type: 'file', name: file.id, extra: convertBytes(file[extra]) }
  })
  return [baseDirecotry]
}

export function FileList<F extends Foam>(props: FileListProps<F>) {
  const { files: userFiles, initialExpand = true, extra = 'statSize' } = props

  const files = useMemo<TreeFile>(() => traverseFile('All', userFiles, extra), [userFiles, extra])

  return <div>
    <Tree initialExpand={initialExpand} value={files} />
  </div>
}
