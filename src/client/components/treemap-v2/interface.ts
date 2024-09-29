export type NativeModule = typeof window.analyzeModule[number]

export type Module = NativeModule & {
  layout: [number, number, number, number]
  size: number
  groups: Module[]
  [key: string]: any
}

export type DuckModule<T = NativeModule> = Record<string, any> & { groups: T[] }
