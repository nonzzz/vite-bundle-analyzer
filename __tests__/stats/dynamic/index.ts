import { createMockStats, getByteLen } from '../helper'

// language=javascript
const code_a = `
 export default {
  name: 'vite-bundle-analyzer'
 }
`
// language=javascript
const code = `const fn = async () => {
 const variable = await import('./a')
 console.log(variable)
}
fn()`

const map = {
  version: 3,
  mappings: '22BAAMA,EAAK,SAAY,CACd,MAAAC,EAAW,MAAMC,EAAA,WAAO,iBAAK,uBACnC,QAAQ,IAAID,CAAQ,CACvB,EAEAD,EAAG',
  names: ['fn', 'variable', '__vitePreload'],
  sources: ['../../src/dynamic.ts'],
  sourcesContent: ["const fn = async () => {\n   const variable = await import('./a')\n   console.log(variable)\n}\n\nfn()\n"],
  file: 'assets/dynamic.js'
}

const size = getByteLen(code)

const map_size = getByteLen(map.toString())

const size_a = getByteLen(code_a)

export default createMockStats('/assets/dynamic.js',
  {
    code,
    dynamicImports: ['a.js'],
    imports: [],
    isEntry: true,
    modules: {
      'a.js': {
        code: code_a,
        originalLength: size_a,
        renderedLength: size_a
      }
    },
    map,
    moduleIds: []
  },
  {
    id: 'assets/dynamic.js',
    label: 'assets/dynamic.js',
    path: 'assets/dynamic.js',
    statSize: size_a,
    parsedSize: size,
    mapSize: map_size,
    stats: [
      { id: 'a.js', label: 'a.js', path: 'a.js', statSize: size_a }
    ]
  }
)
