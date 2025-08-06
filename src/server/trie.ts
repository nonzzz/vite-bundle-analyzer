import type { Any, Empty } from '../../global'

interface NodeDescriptor<T = Record<string, Empty>> {
  meta: T
  filename: string
}

export interface ImportedBy {
  id: string
  kind: 'dynamic' | 'static'
}

export interface ChunkMetadata {
  code: string
  id: string
  importedBy: ImportedBy[]
}

export interface GroupWithNode {
  groups: Array<GroupWithNode>
  // eslint-disable-next-line no-use-before-define
  children?: Map<string, Node>
  filename: string
  label: string
  [prop: string]: Any
}

export class Node<T = Empty> implements NodeDescriptor<T> {
  meta: T
  filename: string
  // eslint-disable-next-line no-use-before-define
  children: Map<string, Node<T>>
  groups: Array<GroupWithNode>
  isEndOfPath: boolean
  constructor(options?: Partial<NodeDescriptor<T>>) {
    this.meta = options?.meta || {} as T
    this.filename = options?.filename || ''
    this.children = new Map()
    this.groups = []
    this.isEndOfPath = false
  }
}

export interface NodeVisitor<T> {
  enter?: (node: GroupWithNode & T, parent: Node<T> | null, isEndOfPath: boolean) => void
  leave?: (node: GroupWithNode & T, parent: Node<T> | null, isEndOfPath: boolean) => void
}

export class Trie<T> {
  root: Node<T>
  constructor(options?: Partial<NodeDescriptor<T>>) {
    this.root = new Node<T>(options)
  }

  // TODO
  insert(filePath: string, desc: Partial<NodeDescriptor<T>>) {
    let current = this.root
    const dirs = filePath.split('/').filter(Boolean)
    let path = ''
    for (const dir of dirs) {
      path = path ? `${path}/${dir}` : dir
      if (!current.children.has(dir)) {
        current.children.set(dir, new Node({ ...desc }))
      }
      current = current.children.get(dir)!
      current.filename = path
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

  walk(node: Node<T>, visitor: NodeVisitor<T>) {
    if (!node.children.size) { return }
    for (const [id, childNode] of node.children.entries()) {
      const child: GroupWithNode & T = {
        ...childNode.meta,
        label: id,
        groups: childNode.groups,
        filename: childNode.filename
      }

      if (childNode.isEndOfPath) {
        // @ts-expect-error safe operation
        delete child.groups
      }

      if (visitor.enter) {
        visitor.enter(child, node, childNode.isEndOfPath)
      }

      this.walk(childNode, visitor)

      if (visitor.leave) {
        visitor.leave(child, node, childNode.isEndOfPath)
      }
    }

    // Memory cleanup
    node.children.clear()
  }
}
