import { createMockStats, getByteLen } from '../helper'

const code = 'const normal = \'vite-bundle-analyzer\''

export default createMockStats('normal.js',
  {
    code,
    dynamicImports: [],
    imports: [],
    isEntry: true,
    map: null,
    moduleIds: []
  }, [
    { id: 'normal.js', label: 'normal.js', path: 'normal.js', statSize: 0, parsedSize: getByteLen(code) }
  ])
