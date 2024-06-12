import type { Module } from './interface'

export function sortChildrenBySize(a: Module, b: Module) {
  return b.weight - a.weight || +(a.id > b.id) - +(a.id < b.id)
}

export function flattenModules<T extends Record<string, any> & { groups: T[] }>(modules: T[]): Omit<T, 'groups'>[] {
  const flattend: Omit<T, 'groups'>[] = []
  for (const module of modules) {
    const { groups, ...rest } = module
    flattend.push(rest)
    if (groups) {
      flattend.push(...flattenModules(groups))
    }
  }
  return flattend
}

export function findRelativeModuleByFilename(module: Module, filename: string): Module | null {
  if (!module) return null
  if (module.filename === filename) return module
  if (module.groups) {
    for (const m of module.groups) {
      const result = findRelativeModuleByFilename(m, filename)
      if (result) return result
    }
  }
  return null
}
