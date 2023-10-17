# vite-plugin-analyzer

<p align="center">
<img src="https://socialify.git.ci/nonzzz/vite-bundle-analyzer/image?description=1&language=1&logo=https%3A%2F%2Fcamo.githubusercontent.com%2F61e102d7c605ff91efedb9d7e47c1c4a07cef59d3e1da202fd74f4772122ca4e%2F68747470733a2f2f766974656a732e6465762f6c6f676f2e737667&name=1&pattern=Circuit%20Board&theme=Auto" alt="vite-bundle-analyzer" width="640" height="320" />
<p>

## Install

```bash

$ yarn add vite-bundle-analyzer -D

# or

$ npm install vite-bundle-analyzer -D

```

## Usage

```js
import { defineConfig } from 'vite'

import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [
    // ...your plugin
     analyzer()
  ]
})
```

## Options

| params                 | type                                          | default           | description                                                    |
| ---------------------- | --------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `analyzerMode`         | `string` | `static`               | In `static` mode single HTML file with bundle report will be generated. In `json` mode single JSON file with bundle report will be generated.                                              |
|`statsFilename`|`string`|`stats.json`| In `json` mode report name |
|`reportFileName`|`string`|`analyzer.html`|In `static` mode report name|
|`gzipOptions`|`Object`|`{}`| `gzip` otpions|


### LICENSE

[MIT](./LICENSE)

### Author

Kanno
