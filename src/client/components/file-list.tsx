import React, { useMemo } from 'react'
import { Tree } from '@geist-ui/core'
import type { TreeProps } from '@geist-ui/core'

type TreeFile = NonNullable<TreeProps['value']>

// type TreeFileType = NonNullable<TreeFile[number]['type']>

type TreeFileItem = TreeFile[number]

//  = typeof window['prettyModule']
export interface FileListProps<F> {
    files: F[]
    initialExpand?: boolean
}

const traverseFile = <F extends typeof window['prettyModule'][number], >(directory: string, files: F[]) => {
  if (!files.length) return []
  const baseDirecotry: TreeFileItem = {
    type: 'directory',
    name: directory
  }

  const traverse = (file: F) => {
    const base: TreeFileItem  = { type: file.children ? 'directory' : 'file', name: file.id }
    if (file.children) {
      base.files = file.children.flatMap(child => {
        return Object.entries(child).map(([subDir, node]) => {
          return { type: 'directory', name: subDir, files: node.map((s) => ({ type: 'file', name: s.id })) }
        })
      })
    }
    return base
  }
  baseDirecotry.files = files.map(traverse)
  return [baseDirecotry]
}

export function FileList<F extends typeof window['prettyModule'][number]>(props: FileListProps<F>) {
  const { files: userFiles, initialExpand = true } = props

  const files = useMemo<TreeFile>(() => traverseFile('All', userFiles), [userFiles])

  return <div>
    <Tree initialExpand={initialExpand} value={files} />
  </div>
}
