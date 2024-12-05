// dprint-ignore
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} :
  T

declare module 'html.mjs' {
  export function html(title: string, module: string): string
}

type Empty = NonNullable<unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
