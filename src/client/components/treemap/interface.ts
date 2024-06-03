import { Module as _Module } from '../../interface'

export interface Module extends _Module {
  layout?: [number, number, number, number]
  groups: Module[]
  size: number
  [prop: string]: any
}

export type FlattenedModule = Omit<Module, 'groups'>

export interface SquarifiedModule {
  node: Omit<Module, 'groups'>
  layout: [number, number, number, number]
  children: SquarifiedModule[]
}
