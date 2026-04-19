// KW binary protocol - must stay in sync with kw.zig
// Tags and ULEB128 zigzag encoding are identical on both sides.
// This file is JS-side only because WASM<->JS boundary call overhead would
// dwarf any benefit of reusing the WASM implementation for encoding.

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
} as const

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function zigZagEncode(n: number) {
  return (n << 1) ^ (n >> 31)
}

function zigZagDecode(n: number) {
  return (n >>> 1) ^ -(n & 1)
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

  private grow(extra: number) {
    const requiredCapacity = this.length + extra
    if (requiredCapacity <= this.capacity) { return }
    const newCapacity = Math.max(this.capacity * 2, requiredCapacity)
    const newBytes = new Uint8Array(newCapacity)
    // Only copy the used portion, not the entire allocated capacity
    newBytes.set(this.bytes.subarray(0, this.length))
    this.bytes = newBytes
    this.capacity = newCapacity
  }

  // Write ULEB128 directly into buffer - no intermediate array allocation.
  // Caller must have called grow() with enough space (max 5 bytes for 32-bit).
  private writeLEB128(value: number) {
    do {
      let byte = value & 0x7f
      value >>>= 7
      if (value !== 0) { byte |= 0x80 }
      this.bytes[this.length++] = byte
    } while (value !== 0)
  }

  writeBool(input: boolean) {
    this.grow(1)
    this.bytes[this.length++] = input ? Tag.true : Tag.false
  }

  writeNil(input: null | undefined) {
    this.grow(1)
    this.bytes[this.length++] = input === null ? Tag.null : Tag.undefined
  }

  writeInt(input: number) {
    this.grow(6) // tag(1) + uleb128 max 5 bytes
    this.bytes[this.length++] = Tag.int
    this.writeLEB128(zigZagEncode(input | 0))
  }

  writeFloat(input: number) {
    this.grow(9) // tag(1) + f64(8)
    this.bytes[this.length++] = Tag.float
    new DataView(this.bytes.buffer, this.length, 8).setFloat64(0, input, true)
    this.length += 8
  }

  writeBytes(input: Uint8Array) {
    this.grow(6 + input.byteLength) // tag(1) + uleb(max 5) + data
    this.bytes[this.length++] = Tag.bytes
    this.writeLEB128(zigZagEncode(input.byteLength | 0))
    this.bytes.set(input, this.length)
    this.length += input.byteLength
  }

  writeString(input: string) {
    // textEncoder.encode() gives us the exact UTF-8 byte count up front,
    // so grow() only allocates what is actually needed. The encodeInto trick
    // (reserving input.length*3 bytes) causes 3x buffer bloat on large strings
    // like sourcemap mappings and hangs the process with memory pressure.
    const utf8 = textEncoder.encode(input)
    this.grow(6 + utf8.length) // tag(1) + uleb(max 5) + utf8
    this.bytes[this.length++] = Tag.string
    this.writeLEB128(zigZagEncode(utf8.length | 0))
    this.bytes.set(utf8, this.length)
    this.length += utf8.length
  }

  writeArray(input: unknown[]) {
    this.grow(6) // tag(1) + uleb(max 5) for count
    this.bytes[this.length++] = Tag.array
    this.writeLEB128(zigZagEncode(input.length | 0))
    for (const item of input) {
      this._write(item)
    }
  }

  writeObject(input: Record<string, unknown>) {
    const entries = Object.entries(input)
    this.grow(6) // tag(1) + uleb(max 5) for count
    this.bytes[this.length++] = Tag.object
    this.writeLEB128(zigZagEncode(entries.length | 0))
    for (const [key, value] of entries) {
      this.writeString(key)
      this._write(value)
    }
  }

  private _write(data: unknown) {
    switch (typeof data) {
      case 'boolean':
        this.writeBool(data)
        break
      case 'undefined':
        this.writeNil(undefined)
        break
      case 'object':
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
  }

  encode(data: unknown) {
    this._write(data)
    return this
  }

  dupe(): Uint8Array {
    return this.bytes.slice(0, this.length)
  }

  view(): Uint8Array {
    return this.bytes.subarray(0, this.length)
  }
}

class Reader {
  private bytes: Uint8Array
  private offset: number

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.offset = 0
  }

  private readULEB128(): number {
    let result = 0
    let shift = 0
    let byte: number
    const bytes = this.bytes
    do {
      byte = bytes[this.offset++]
      result |= (byte & 0x7f) << shift
      shift += 7
    } while (byte & 0x80)
    return result
  }

  private readLength(): number {
    return zigZagDecode(this.readULEB128())
  }

  decode(): unknown {
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
      case Tag.int:
        return zigZagDecode(this.readULEB128())
      case Tag.float: {
        const value = new DataView(this.bytes.buffer, this.offset, 8).getFloat64(0, true)
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
        // subarray is zero-copy; textDecoder.decode() accepts a view directly
        const value = textDecoder.decode(this.bytes.subarray(this.offset, this.offset + length))
        this.offset += length
        return value
      }
      case Tag.array: {
        const length = this.readLength()
        const arr: unknown[] = new Array(length)
        for (let i = 0; i < length; i++) {
          arr[i] = this.decode()
        }
        return arr
      }
      case Tag.object: {
        const length = this.readLength()
        const obj = Object.create(null) as Record<string, unknown>
        for (let i = 0; i < length; i++) {
          const key = this.decode() as string
          obj[key] = this.decode()
        }
        return obj
      }
      default:
        throw new Error(`Unsupported tag: 0x${tag.toString(16)}`)
    }
  }
}

export function kwEncode(data: unknown, initCapacity = 256): Uint8Array {
  return new Writer(initCapacity).encode(data).dupe()
}

export function kwDecode(bytes: Uint8Array): unknown {
  return new Reader(bytes).decode()
}
