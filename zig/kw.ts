// note complex kind we using uleb 128.
export const Tag = {
  null: 0x00,
  undefined: 0x01,
  true: 0x02,
  false: 0x03,
  int: 0x04,
  float: 0x05,
  bytes: 0x06,
  string: 0x07,
  array: 0x08,
  object: 0x09
}

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function zigZagEncode(n: number) {
  return (n << 1) ^ (n >> 31)
}

function zigZagDecode(n: number) {
  return (n >>> 1) ^ -(n & 1)
}

function writeULEB128(value: number): number[] {
  const bytes: number[] = []
  do {
    let byte = value & 0x7f
    value >>>= 7
    if (value !== 0) {
      byte |= 0x80
    }
    bytes.push(byte)
  } while (value !== 0)
  return bytes
}

function readULEB128(bytes: Uint8Array, offset: number): [number, number] {
  let result = 0
  let shift = 0
  let byte: number
  let currentOffset = offset

  do {
    byte = bytes[currentOffset++]
    result |= (byte & 0x7f) << shift
    shift += 7
  } while (byte & 0x80)

  return [result, currentOffset]
}

export class Writer {
  private capacity: number
  private bytes: Uint8Array
  private length: number
  constructor(initCapacity: number) {
    this.capacity = initCapacity
    this.bytes = new Uint8Array(initCapacity)
    this.length = 0
  }

  grow(extra: number) {
    const requiredCapacity = this.length + extra
    if (requiredCapacity <= this.capacity) {
      return
    }
    const newCapacity = Math.max(this.capacity * 2, requiredCapacity)
    const newBytes = new Uint8Array(newCapacity)
    newBytes.set(this.bytes)
    this.bytes = newBytes
    this.capacity = newCapacity
  }

  writeBool(input: boolean) {
    this.grow(1)
    this.bytes.set([input ? Tag.true : Tag.false], this.length)
    this.length += 1
  }
  writeNil(input: null | undefined) {
    this.grow(1)
    this.bytes.set([input === null ? Tag.null : Tag.undefined], this.length)
    this.length += 1
  }

  writeInt(input: number) {
    this.grow(1)
    this.bytes.set([Tag.int], this.length)
    this.length += 1
    const zigZagged = zigZagEncode(input | 0)
    const encoded = writeULEB128(zigZagged)
    this.grow(encoded.length)
    this.bytes.set(encoded, this.length)
    this.length += encoded.length
  }

  writeFloat(input: number) {
    this.grow(1 + 8)
    this.bytes.set([Tag.float], this.length)
    this.length += 1
    const view = new DataView(this.bytes.buffer, this.length, 8)
    view.setFloat64(0, input, true) // little-endian
    this.length += 8
  }

  writeBytes(input: Uint8Array) {
    this.grow(1)
    this.bytes.set([Tag.bytes], this.length)
    this.length += 1

    const zigZagged = zigZagEncode(input.byteLength | 0)
    const encoded = writeULEB128(zigZagged)

    this.grow(encoded.length + input.byteLength)
    this.bytes.set(encoded, this.length)
    this.length += encoded.length
    this.bytes.set(input, this.length)
    this.length += input.byteLength
  }

  writeString(input: string) {
    this.grow(1)
    this.bytes.set([Tag.string], this.length)
    this.length += 1

    const utf8Bytes = textEncoder.encode(input)

    const zigZagged = zigZagEncode(utf8Bytes.byteLength | 0)
    const encoded = writeULEB128(zigZagged)

    this.grow(encoded.length + utf8Bytes.byteLength)
    this.bytes.set(encoded, this.length)
    this.length += encoded.length
    this.bytes.set(utf8Bytes, this.length)
    this.length += utf8Bytes.byteLength
  }

  writeArray(input: unknown[]) {
    this.grow(1)
    this.bytes.set([Tag.array], this.length)
    this.length += 1

    const zigZagged = zigZagEncode(input.length | 0)
    const encoded = writeULEB128(zigZagged)

    this.grow(encoded.length)
    this.bytes.set(encoded, this.length)
    this.length += encoded.length

    for (const item of input) {
      this.encode(item)
    }
  }

  writeObject(input: Record<string, unknown>) {
    this.grow(1)
    this.bytes.set([Tag.object], this.length)
    this.length += 1

    const entries = Object.entries(input)

    const zigZagged = zigZagEncode(entries.length | 0)
    const encoded = writeULEB128(zigZagged)

    this.grow(encoded.length)
    this.bytes.set(encoded, this.length)
    this.length += encoded.length

    for (const [key, value] of entries) {
      this.writeString(key)
      this.encode(value)
    }
  }

  encode(data: unknown) {
    switch (typeof data) {
      case 'boolean':
        this.writeBool(data)
        break
      case 'undefined':
        this.writeNil(undefined)
        break
      case 'object': {
        if (data === null) {
          this.writeNil(null)
        } else if (data instanceof Uint8Array) {
          this.writeBytes(data)
        } else if (Array.isArray(data)) {
          this.writeArray(data)
        } else {
          this.writeObject(data as Record<string, unknown>)
        }
        break
      }
      case 'string':
        this.writeString(data)
        break
      case 'number':
        if (Number.isInteger(data) && data >= -2147483648 && data <= 2147483647) {
          this.writeInt(data)
        } else {
          this.writeFloat(data)
        }
        break
      default:
        throw new Error(`Unsupported data type: ${typeof data}`)
    }
    return this.bytes.slice(0, this.length)
  }

  dupe() {
    return this.bytes.slice(0, this.length)
  }
}

class Reader {
  private bytes: Uint8Array
  private offset: number
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.offset = 0
  }

  readULEB128() {
    const [value, newOffset] = readULEB128(this.bytes, this.offset)
    this.offset = newOffset
    return value
  }

  readLength() {
    const zigZagged = this.readULEB128()
    return zigZagDecode(zigZagged)
  }

  decode() {
    const tag = this.bytes[this.offset++]
    switch (tag) {
      case Tag.true:
        return true
      case Tag.false:
        return false
      case Tag.null:
        return null
      case Tag.undefined:
        return undefined
      case Tag.int: {
        const zigZagged = this.readULEB128()
        return zigZagDecode(zigZagged)
      }
      case Tag.float: {
        const view = new DataView(this.bytes.buffer, this.offset, 8)
        const value = view.getFloat64(0, true)
        this.offset += 8
        return value
      }
      case Tag.bytes: {
        const length = this.readLength()
        const value = this.bytes.slice(this.offset, this.offset + length)
        this.offset += length
        return value
      }
      case Tag.string: {
        const length = this.readLength()
        const utf8Bytes = this.bytes.slice(this.offset, this.offset + length)
        this.offset += length
        return textDecoder.decode(utf8Bytes)
      }
      case Tag.array: {
        const length = this.readLength()
        const arr: unknown[] = []
        for (let i = 0; i < length; i++) {
          arr.push(this.decode())
        }
        return arr
      }
      case Tag.object: {
        const length = this.readLength()
        const obj: Record<string, unknown> = {}
        for (let i = 0; i < length; i++) {
          const key = this.decode() as string
          const value = this.decode()
          obj[key] = value
        }
        return obj
      }
      default:
        throw new Error(`Unsupported tag: ${tag}`)
    }
  }
}

function encode(data?: unknown) {
  const w = new Writer(256)
  return w.encode(data)
}

function decode(bytes: Uint8Array) {
  const r = new Reader(bytes)
  return r.decode()
}

export const kw = {
  encode,
  decode
}
