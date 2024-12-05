const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz(
  { typescript: true },
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/components.d.ts',
      '**/analysis'
    ]
  },
  {
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off'
    }
  }
)
