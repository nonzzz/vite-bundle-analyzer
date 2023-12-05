import { createMockStats, getByteLen } from '../helper'

const code_a = `
export default {
  name:'vite-bundle-analyzer'
}
`

const code = `const fn = async () => {
   const variable = await import('./a.js')
   console.log(variable)
}`

const size = getByteLen(code)

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
    map: null,
    moduleIds: []
  },
  { id: 'assets/dynamic.js',
    label: 'assets/dynamic.js',
    path: 'assets/dynamic.js',
    statSize: size_a,
    parsedSize: size,
    stats: [
      { id: 'a.js', label: 'a.js', path: 'a.js', statSize: size_a }
    ]
  }
)
