/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildAsPascalString<T extends Record<string, unknown>>(object: T) {
  const encoder = new TextEncoder()

  const entries = Object.entries(object).map(([k, v]) => {
    let str: string
    if (typeof v === 'string') {
      str = v
    } else if (Array.isArray(v)) {
      str = v.join(',')
    } else if (v === null || v === undefined) {
      str = ''
    } else {
      str = String(v as unknown)
    }

    return [encoder.encode(k), encoder.encode(str)] as const
  })

  const size = entries.reduce((s, [k, v]) => s + 8 + k.length + v.length, 0)
  const buf = new Uint8Array(size)
  const view = new DataView(buf.buffer)

  let pos = 0
  for (const [k, v] of entries) {
    view.setUint32(pos, k.length, true)
    buf.set(k, pos += 4)
    view.setUint32(pos += k.length, v.length, true)
    buf.set(v, pos += 4)
    pos += v.length
  }

  return buf
}

export function decodePascalString<T extends Record<string, any>>(data: Uint8Array): T {
  const decoder = new TextDecoder()
  const view = new DataView(data.buffer, data.byteOffset)
  const result = <T> {}

  let pos = 0
  while (pos + 8 <= data.length) {
    const klen = view.getUint32(pos, true)
    const key = decoder.decode(data.subarray(pos += 4, pos += klen))

    const vlen = view.getUint32(pos, true)
    const value = decoder.decode(data.subarray(pos += 4, pos += vlen))

    // @ts-expect-error safe
    result[key] = value
  }

  return result
}
