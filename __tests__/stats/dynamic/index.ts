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

const size = getByteLen(code_a)

export default createMockStats('/assets/dynamic.js',
  {
    code,
    dynamicImports: ['a.js'],
    imports: [],
    isEntry: true,
    modules: {
      'a.js': {
        code: code_a,
        originalLength: size,
        renderedLength: size
      }
    }
  }, { id: 'assets/dynamic.js',
    label: 'assets/dynamic.js',
    path: 'assets/dynamic.js',
    statSize: size,
    parsedSize: size,
    groups: [
      { path: 'a.js', id: 'a.js', label: 'a.js', statSize: size, parsedSize: size }
    ]
  })
