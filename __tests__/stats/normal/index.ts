import { createMockStats, generateSourceMap, getByteLen } from '../helper'

const code = "const normal = 'vite-bundle-analyzer'"

const map = generateSourceMap(code, code, 'normal.js')

export default createMockStats('normal.js', {
  code,
  dynamicImports: [],
  imports: [],
  isEntry: true,
  map,
  moduleIds: [],
  modules: {},
  type: 'chunk'
}, [
  { filename: 'normal.js', label: 'normal.js', parsedSize: getByteLen(code), mapSize: getByteLen(map) }
])
