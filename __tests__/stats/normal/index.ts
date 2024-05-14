import { createMockStats, generateSourceMap, getByteLen } from '../helper'

const code = 'const normal = \'vite-bundle-analyzer\''

const map = generateSourceMap(code, code, 'normal.js')

export default createMockStats('normal.js',
  {
    code,
    dynamicImports: [],
    imports: [],
    isEntry: true,
    map,
    moduleIds: [],
    type: 'chunk'
  }, [
    { filename: 'normal.js', label: 'normal.js', statSize: getByteLen(code), parsedSize: getByteLen(code), mapSize: getByteLen(map) }
  ])
