const { nonzzz } = require('eslint-config-kagura')

module.exports = nonzzz({ ts: true }, { ignores: ['dist', 'node_modules'] })
