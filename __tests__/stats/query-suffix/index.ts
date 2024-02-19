import { createMockStats, getByteLen } from '../helper'

const code = 'const normal = \'vite-bundle-analyzer\''

const map = {
  version: 3,
  file: 'query-suffix.js',
  sources: [],
  sourcesContent: [],
  names: [],
  mappings: ''
}

const map_size = getByteLen(map.toString())

export default createMockStats('normal.js',
  {
    type: 'asset',
    source: code,
    fileName: 'query-suffix.js',
    __monkey__map__: JSON.stringify(map),
    __monkey__map__id: map.file
  }, [
    { id: 'query-suffix.js', label: 'query-suffix.js', path: 'query-suffix.js', statSize: 0, parsedSize: getByteLen(code), mapSize: map_size }
  ])
