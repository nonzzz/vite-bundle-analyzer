import { Module as _Module } from '../../interface'

export interface Module extends _Module {
  layout?: [number, number, number, number]
  [prop: string]: any
}
