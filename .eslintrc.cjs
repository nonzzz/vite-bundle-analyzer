module.exports = {
  extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:jsx-a11y/recommended', 'kagura/typescript'],
  rules: {
    'jsx-quotes': ['error', 'prefer-single'],
    'react/prop-types': 'off',
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 'first'],
    'react/jsx-tag-spacing': ['error', {
      closingSlash: 'never',
      beforeSelfClosing: 'always',
      afterOpening: 'never',
      beforeClosing: 'never'
    }]
  }
}
