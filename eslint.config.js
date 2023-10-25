const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz({ ts: true, jsx: true, react: true }, { ignores: ['dist', 'node_modules'] })
