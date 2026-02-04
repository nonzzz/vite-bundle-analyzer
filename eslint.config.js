const { nonzzz } = require('eslint-config-kagura')
const { react } = require('@eslint-sukka/react')

module.exports = nonzzz(
  { typescript: true },
  ...react(),
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/components.d.ts',
      '**/analysis',
      '**/fixtures'
    ]
  }
)
