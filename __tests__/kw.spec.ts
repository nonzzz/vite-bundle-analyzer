import { describe, expect, it } from 'vitest'
import { kw } from '../zig/kw'

describe('kw', () => {
  it('bool', () => {
    const output = kw.encode(true)
    expect(kw.decode(output)).toBe(true)
    const output2 = kw.encode(false)
    expect(kw.decode(output2)).toBe(false)
  })
  it('nil', () => {
    const ouput = kw.encode(null)
    expect(kw.decode(ouput)).toBe(null)
    const ouput2 = kw.encode(undefined)
    expect(kw.decode(ouput2)).toBe(undefined)
  })
  it('int32/uint32', () => {
    const output = kw.encode(42)
    expect(kw.decode(output)).toBe(42)
    const output2 = kw.encode(-42)
    expect(kw.decode(output2)).toBe(-42)
  })
  it('float32', () => {
    const output = kw.encode(3.14)
    expect(kw.decode(output)).toBe(3.14)
  })
  it('bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const output = kw.encode(data)
    expect(kw.decode(output)).toStrictEqual(data)
  })
  it('string', () => {
    const data = 'Hello, 世界'
    const output = kw.encode(data)
    expect(kw.decode(output)).toBe(data)
  })
  it('object', () => {
    const data = { name: 'kanno' }
    const output = kw.encode(data)
    const decoded = kw.decode(output) as typeof data
    expect(decoded.name).toBe(data.name)
  })
  it('array', () => {
    const data = [1, 'two', true, null]
    const output = kw.encode(data)
    const decoded = kw.decode(output) as typeof data
    expect(decoded[0]).toBe(data[0])
    expect(decoded[1]).toBe(data[1])
    expect(decoded[2]).toBe(data[2])
    expect(decoded[3]).toBe(data[3])
  })

  it('complex object', () => {
    const data = {
      name: 'kanno',
      isAdmin: true,
      tags: ['developer', 'typescript'],
      meta: {
        createdAt: '2024-06-01T00:00:00Z'
      }
    }
    const output = kw.encode(data)
    const decoded = kw.decode(output) as typeof data
    expect(decoded.name).toBe(data.name)
    expect(decoded.isAdmin).toBe(data.isAdmin)
    expect(decoded.tags).toEqual(data.tags)
    expect(decoded.meta).toEqual(data.meta)
  })
})
