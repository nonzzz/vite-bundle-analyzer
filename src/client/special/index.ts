export const ALLOWED_MAGIC_TYPE = ['graph:click'] as const

export type AllowedMagicType = typeof ALLOWED_MAGIC_TYPE[number]

export function createMagicEvent(type: AllowedMagicType, data: any) {
  return new CustomEvent(type, { detail: data })
}

export type QueryKind = 'gzip' | 'stat' | 'parsed'
