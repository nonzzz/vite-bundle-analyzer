<p align="center">
  <img src="https://socialify.git.ci/nonzzz/vite-bundle-analyzer/image?font=KoHo&language=1&logo=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F65625612%3Fs%3D200%26v%3D4&name=1&owner=1&pattern=Circuit%20Board&theme=Auto" alt="vite-bundle-analyzer" width="640" height="320" />
<p>
<p align="center">
  <a href="https://npmjs.com/package/vite-bundle-analyzer">
    <img src="https://img.shields.io/npm/v/vite-bundle-analyzer.svg">
  </a>
  <a href="https://npmjs.com/package/vite-bundle-analyzer">
    <img src="https://img.shields.io/npm/dm/vite-bundle-analyzer.svg">
  </a>
  <a href='https://github.com/sindresorhus/awesome'>
    <img src='https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg' alt='Awesome'>
  </a>
</p>

> [!WARNING]
> Vite's enable minify by default.There for you will see that the parsed size is larger than actual size.This is because the bundle info
> provide by rollup isn't compressed.(If you care about this problem you can choose anothr plugins.)

![analyzer](./analyzer.gif)

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
| `fileName`     | `string`               | `stats`       | The name of the static product.（No need to include `.ext` name）    |
| `reportTitle`  | `string`               | `plugin name` | Report website title.                                                |
| `gzipOptions`  | `Record<string,any>`   | `{}`          | Compression options. (details see `zlib module`)                     |
| `analyzerPort` | `number\|'auto'`       | `8888`        | static server port.                                                  |
| `openAnalyzer` | `boolean`              | `true`        | Open the static website. (Only works on `analyzerMode` is `server` ) |
| `summary`      | `boolean`              | `true`        | Show full chunk info to stdout.                                      |

### LICENSE

[MIT](./LICENSE)

### Contributions

Contributions are welcome! If you find a bug or want to add a new feature, please open an issue or submit a pull
request.

### Author and contributors

<p align="center">
  <a href="https://github.com/nonzzz">
    <img src="https://avatars.githubusercontent.com/u/52351095?v=4&s=40" width="40" height="40" alt="Kanno">
  </a>
  <a href="https://github.com/contributor1">
    <img src="https://avatars.githubusercontent.com/u/77048647?v=4&s=40" width="40" height="40" alt="Aleksandr Mitskevich">
  </a>
  <!-- Add more contributors as needed -->
</p>
