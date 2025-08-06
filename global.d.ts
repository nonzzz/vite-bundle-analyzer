// dprint-ignore
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} :
  T

export type Empty = NonNullable<unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any
