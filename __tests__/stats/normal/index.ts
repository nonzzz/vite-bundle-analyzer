import { createMockStats } from '../helper'

const code = 'const normal = \'vite-bundle-analyzer\''

export default createMockStats('normal.js',
  {
    code,
    dynamicImports: [],
    imports: [],
    isEntry: true
  }, [
    { id: 'normal.js', label: 'normal.js', path: 'normal.js', statSize: 0, parsedSize: 0 }
  ])
