export type Kind = 'stat' | 'source'

interface NodeDescriptor<T = Record<string, any>> {
  kind: Kind,
  meta: T
  filename: string
}

export interface KindStat {
  statSize: number
}

export interface KindSource {
  parsedSize: number
  gzipSize: number
}

export interface ChunkMetadata {
  code: string
  id: string
}

export interface GroupWithNode {
  id: string
  groups: Array<GroupWithNode>
  // eslint-disable-next-line no-use-before-define
  children?: Map<string, Node<any>>
  [prop: string]: any
}

export class Node<T> implements NodeDescriptor<T> {
  kind: Kind
  meta: T
  filename: string
  // eslint-disable-next-line no-use-before-define
  children: Map<string, Node<T>>
  groups: Array<GroupWithNode>
  isEndOfPath: boolean
  constructor(options?: Partial<NodeDescriptor<T>>) {
    this.kind = options?.kind || 'stat'
    this.meta = options?.meta || {} as T
    this.filename = options?.filename || ''
    this.children = new Map()
    this.groups = []
    this.isEndOfPath = false
  }
}

export class FileSystemTrie<T> {
  root: Node<T>
  constructor(options?: Partial<NodeDescriptor<T>>) {
    this.root = new Node<T>(options)
  }

  // TODO
  insert(filePath: string, desc: Partial<NodeDescriptor<T>>) {
    let current = this.root
    const dirs = filePath.split('/').filter(Boolean)
    for (const dir of dirs) {
      if (!current.children.has(dir)) {
        current.children.set(dir, createNode({ ...desc, filename: dir }))
      }
      current = current.children.get(dir)!
    }
    current.isEndOfPath = true
  }

  // Traverse trie.If the length of children is greater than 1 and itsn't endOfPath
  // Merge the common prefixes of the parent nodes.
  mergePrefixSingleDirectory(node = this.root) {
    for (const [key, childNode] of node.children.entries()) {
      if (childNode.isEndOfPath) {
        break
      }
      if (childNode.children.size > 1) {
        this.mergePrefixSingleDirectory(childNode)
        continue
      }
      node.children.delete(key)
      for (const [subKey, subNode] of childNode.children.entries()) {
        node.children.set(`${key}/${subKey}`, subNode)
        if (!subNode.isEndOfPath) {
          this.mergePrefixSingleDirectory(subNode)
        }
      }
    }
  }

  walk(node: Node<T>, handler: (id: string, node: Node<T>, parent: GroupWithNode) => void) {
    if (!node.children.size) return
    for (const [id, childNode] of node.children.entries()) {
      handler(id, childNode, node as unknown as GroupWithNode)
      this.walk(childNode, handler)
    }
    // memory free
    node.children.clear()
  }
}

export function createNode<T>(options?: Partial<NodeDescriptor<T>>) {
  return new Node(options)
}

export function createFileSystemTrie<T>(options?: Partial<NodeDescriptor<T>>) {
  return new FileSystemTrie(options)
}
