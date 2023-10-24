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
import { defineConfig } from "vite";

import { analyzer } from "vite-bundle-analyzer";

export default defineConfig({
  plugins: [
    // ...your plugin
    analyzer(),
  ],
});
```

## Options

| params         | type                   | default       | description                                                          |
| -------------- | ---------------------- | ------------- | -------------------------------------------------------------------- |
| `analyzerMode` | `server\|static\|json` | `server`      | In `server` will create a static server to preview.                  |
| `filename`     | `string`               | `stats`       | The name of the static product.（No need extname）                   |
| `reportTitle`  | `string`               | `plugin name` | Report website title.                                                |
| `gzipOptions`  | `Record<string,any>`   | `{}`          | Compression options (details see `zlib module`)                      |
| `analyzerPort` | `number\|'auto'`       | `8888`        | static server port                                                   |
| `openAnalyzer` | `boolean`              | `true`        | Open the static website. (Only works on `analyzerMode` is `server` ) |

### LICENSE

[MIT](./LICENSE)

### Author

Kanno
