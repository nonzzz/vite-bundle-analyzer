import { Module as _Module } from '../../interface'

export type Module = _Module & {
  weight: number
  groups: Module[]
  [prop: string]: any
}

export type FlattenedModule = Omit<Module, 'groups'>
