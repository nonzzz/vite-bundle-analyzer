import { describe, expect, it } from 'vitest'
import { binary } from '../zig/kw'

describe('kw', () => {
  it('bool', () => {
    const output = binary.encode(true)
    expect(binary.decode(output)).toBe(true)
    const output2 = binary.encode(false)
    expect(binary.decode(output2)).toBe(false)
  })
  it('nil', () => {
    const ouput = binary.encode(null)
    expect(binary.decode(ouput)).toBe(null)
    const ouput2 = binary.encode(undefined)
    expect(binary.decode(ouput2)).toBe(undefined)
  })
  it('int32/uint32', () => {
    const output = binary.encode(42)
    expect(binary.decode(output)).toBe(42)
    const output2 = binary.encode(-42)
    expect(binary.decode(output2)).toBe(-42)
  })
  it('float32', () => {
    const output = binary.encode(3.14)
    expect(binary.decode(output)).toBe(3.14)
  })
  it('bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const output = binary.encode(data)
    expect(binary.decode(output)).toStrictEqual(data)
  })
  it('string', () => {
    const data = 'Hello, 世界'
    const output = binary.encode(data)
    expect(binary.decode(output)).toBe(data)
  })
  it('object', () => {
    const data = { name: 'kanno' }
    const output = binary.encode(data)
    expect(binary.decode(output)).toStrictEqual(data)
  })
  it('array', () => {
    const data = [1, 'two', true, null]
    const output = binary.encode(data)
    expect(binary.decode(output)).toStrictEqual(data)
  })
  it('map', () => {
    const data = new Map<unknown, unknown>([['key1', 'value1'], ['key2', 42]])
    const output = binary.encode(data)
    expect(binary.decode(output)).toStrictEqual(data)
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
    const output = binary.encode(data)
    expect(binary.decode(output)).toStrictEqual(data)
  })
})
