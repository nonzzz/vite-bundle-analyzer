const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz(
  { ts: true, jsx: true, react: true, unusedImports: false },
  {
    ignores: [
      'dist',
      'node_modules',
      'examples/vue/dist/**',
      'examples/vue/node_modules',
      '__tests__/dist',
      '**/*.d.ts'
    ],
    rules: {
      'stylistic/indent': 'off',
      'stylistic/space-before-function-paren': 'off'
    }
  }
)
