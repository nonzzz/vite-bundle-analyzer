import { test } from 'vitest'
import { convertBytes } from '../src/shared'

test('convert bytes', async (t) => {
  t.expect(convertBytes(0), '0 Bytes')
  t.expect(convertBytes(Math.pow(1024, 1)), '1.00 KB')
  t.expect(convertBytes(Math.pow(1024, 2)), '1.00 MB')
  t.expect(convertBytes(Math.pow(1024, 3)), '1.00 GB')
  // TODO: seems like incorrect
  t.expect(convertBytes(Math.pow(1024, 4)), '4294967296.00 TB')
})
