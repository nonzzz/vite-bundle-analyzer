import { describe, expect, it } from 'vitest'
import { kwDecode, kwEncode } from '../zig/kw'

describe('kw', () => {
  it('bool', () => {
    const output = kwEncode(true)
    expect(kwDecode(output)).toBe(true)
    const output2 = kwEncode(false)
    expect(kwDecode(output2)).toBe(false)
  })
  it('nil', () => {
    const ouput = kwEncode(null)
    expect(kwDecode(ouput)).toBe(null)
    const ouput2 = kwEncode(undefined)
    expect(kwDecode(ouput2)).toBe(undefined)
  })
  it('int32/uint32', () => {
    const output = kwEncode(42)
    expect(kwDecode(output)).toBe(42)
    const output2 = kwEncode(-42)
    expect(kwDecode(output2)).toBe(-42)
  })
  it('float32', () => {
    const output = kwEncode(3.14)
    expect(kwDecode(output)).toBe(3.14)
  })
  it('bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const output = kwEncode(data)
    expect(kwDecode(output)).toStrictEqual(data)
  })
  it('string', () => {
    const data = 'Hello, 世界'
    const output = kwEncode(data)
    expect(kwDecode(output)).toBe(data)
  })
  it('object', () => {
    const data = { name: 'kanno' }
    const output = kwEncode(data)
    const decoded = kwDecode(output) as typeof data
    expect(decoded.name).toBe(data.name)
  })
  it('array', () => {
    const data = [1, 'two', true, null]
    const output = kwEncode(data)
    const decoded = kwDecode(output) as typeof data
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
    const output = kwEncode(data)
    const decoded = kwDecode(output) as typeof data
    expect(decoded.name).toBe(data.name)
    expect(decoded.isAdmin).toBe(data.isAdmin)
    expect(decoded.tags).toEqual(data.tags)
    expect(decoded.meta).toEqual(data.meta)
  })
})
