import { createMockStats, getByteLen } from '../helper'

const code = 'const normal = \'vite-bundle-analyzer\''

const map = {
  version: 3,
  file: 'noraml.js',
  sources: [],
  sourcesContent: [],
  names: [],
  mappings: ''
}

const map_size = getByteLen(map.toString())

export default createMockStats('normal.js',
  {
    code,
    dynamicImports: [],
    imports: [],
    isEntry: true,
    map,
    moduleIds: []
  }, [
    { id: 'normal.js', label: 'normal.js', path: 'normal.js', statSize: 0, parsedSize: getByteLen(code), mapSize: map_size }
  ])
