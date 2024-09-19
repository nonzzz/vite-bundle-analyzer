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
import { defineConfig } from 'vite'

import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [
    // ...your plugin
    analyzer()
  ]
})

// If you are using it in rollup or others support rollup plugin system you can import 'adapter' from package.
// Then use it with adapter(analyzer())
```

## Options

| params         | type                   | default       | description                                                                      |
| -------------- | ---------------------- | ------------- | -------------------------------------------------------------------------------- |
| `analyzerMode` | `server\|static\|json` | `server`      | In `server` will create a static server to preview.                              |
| `fileName`     | `string`               | `stats`       | The name of the static product.（No suffix name）                                |
| `reportTitle`  | `string`               | `plugin name` | Report website title.                                                            |
| `gzipOptions`  | `Record<string,any>`   | `{}`          | Compression options. (Details see `zlib module`)                                 |
| `analyzerPort` | `number\|'auto'`       | `8888`        | static server port.                                                              |
| `openAnalyzer` | `boolean`              | `true`        | Open the static website. (Only works on `analyzerMode` is `server` or `static` ) |
| `defaultSizes` | `stat\|parsed\|gzip`   | `stat`        | The default type selected in the client page                                     |
| `summary`      | `boolean`              | `true`        | Show full chunk info to stdout.                                                  |

### Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg"/>
  </a>
</p>

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

### DEBUG

If you're using vite you can get the logs with `vite build --debug` and then extreact the part relevant to `analyze` plugin. Or using `cross-env` to setup `ANALYZE_DEBUG=true` in your local.
env.

### Why i get the chunk size is empty?

If you're use a plugin that break the `sourcemap` it will affect the analyze plugin. I know it's stupid, But is the way to get the size close to the actual size. Like `@vitejs/plugin-legacy` don't prvide
the correctly sourcemap for legacy chunk. For some reason, no analysis will be provided for those module.

### Why when i specify analyzerMode as static and set openAnalyzer as false don't create a liviing server?

I don't want to add new option to control living server.

### LICENSE

[MIT](./LICENSE)
