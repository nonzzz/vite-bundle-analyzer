<p align="center">
  <img src="https://socialify.git.ci/nonzzz/vite-bundle-analyzer/image?font=KoHo&language=1&logo=https%3A%2F%2Favatars.githubusercontent.com%2Fu%2F65625612%3Fs%3D200%26v%3D4&name=1&owner=1&pattern=Circuit%20Board&theme=Auto" alt="vite-bundle-analyzer" width="640" height="320" />
</p>

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

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/nonzzz/vite-bundle-analyzer@latest/imgs/now.gif" width="640" height="320" />
</p>

# Vite Bundle Analyzer

A bundle analyzer for Vite, Rollup, and Rolldown that visualizes bundle size with an interactive treemap.

> [!WARNING]
> Vite enables minification by default. The parsed size may appear larger than actual size because bundle info from Rollup isn't compressed. Rolldown support is experimental.

## Installation

```bash
npm install vite-bundle-analyzer -D
# or
yarn add vite-bundle-analyzer -D
# or
pnpm add vite-bundle-analyzer -D
```

## Usage

### Vite

```js
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  plugins: [
    analyzer()
  ]
})
```

### Rollup

```js
import { adapter } from 'vite-bundle-analyzer'
import { analyzer } from 'vite-bundle-analyzer'

export default {
  plugins: [
    adapter(analyzer())
  ]
}
```

### Rolldown Plugin (Experimental)

```js
import { unstableRolldownAdapter } from 'vite-bundle-analyzer'
import { analyzer } from 'vite-bundle-analyzer'

export default {
  plugins: [
    unstableRolldownAdapter(analyzer())
  ]
}
```

## Configuration

| Option          | Type                                          | Default                  | Description                                 |
| --------------- | --------------------------------------------- | ------------------------ | ------------------------------------------- |
| `analyzerMode`  | `'server' \| 'static' \| 'json' \| function`  | `'server'`               | Analysis output mode                        |
| `fileName`      | `string \| function`                          | `'stats'`                | Output filename (without extension)         |
| `reportTitle`   | `string`                                      | `'Vite Bundle Analyzer'` | Report page title                           |
| `gzipOptions`   | `Record<string, any>`                         | `{}`                     | Gzip compression options (see zlib module)  |
| `brotliOptions` | `Record<string, any>`                         | `{}`                     | Brotli compression options                  |
| `analyzerPort`  | `number \| 'auto'`                            | `8888`                   | Server port                                 |
| `openAnalyzer`  | `boolean`                                     | `true`                   | Auto-open browser (server/static mode only) |
| `defaultSizes`  | `'stat' \| 'gzip' \| 'brotli'`                | `'stat'`                 | Default size metric                         |
| `summary`       | `boolean`                                     | `true`                   | Show summary in console                     |
| `enabled`       | `boolean`                                     | `true`                   | Enable/disable plugin                       |
| `include`       | `string \| RegExp \| Array<string \| RegExp>` | `[]`                     | Include patterns                            |
| `exclude`       | `string \| RegExp \| Array<string \| RegExp>` | `[]`                     | Exclude patterns                            |
| `pathFormatter` | `(path: string, defaultWd: string) => string` | `undefined`              | Formatting Paths                            |

## CLI

```bash
npx vite-bundle-analyzer

# With options
npx vite-bundle-analyzer --help
```

## Common Issues

### Empty Chunk Sizes

If chunk sizes appear empty, check for plugins that break source maps (e.g., `@vitejs/plugin-legacy`). The analyzer relies on source maps for accurate size calculation.

### Vite-based Frameworks

For frameworks built on Vite (VitePress, Remix, Qwik), use `analyzerMode: 'server'` for accurate results due to multiple build instances.

### Static Mode Without Server

When `analyzerMode: 'static'` and `openAnalyzer: false`, no development server is created.

## API Integration

```ts
import { SSE, createServer, injectHTMLTag, openBrowser, renderView } from 'vite-bundle-analyzer'

// Create custom server
const server = createServer()
server.get('/', async (c) => {
  const html = await renderView(data, { title: 'Custom Analyzer', mode: 'stat' })
  c.res.writeHead(200, { 'Content-Type': 'text/html' })
  c.res.write(html)
  c.res.end()
})
server.listen(3000)
```

## Debug

```bash
# Vite
vite build --debug

# Environment variable
ANALYZE_DEBUG=true npm run build
```

## Related

- [ROLLDOWN](./ROLLDOWN.md)
- [Q&A](./Q&A.md)
- [CHANGELOG](./CHANGELOG.md)

## Contributors

<p align="center">
  <a href="https://github.com/nonzzz">
    <img src="https://avatars.githubusercontent.com/u/52351095?v=4&s=40" width="40" height="40" alt="Kanno">
  </a>
  <a href="https://github.com/a3mitskevich">
    <img src="https://avatars.githubusercontent.com/u/77048647?v=4&s=40" width="40" height="40" alt="Aleksandr Mitskevich">
  </a>
  <a href="https://github.com/mengdaoshizhongxinyang">
    <img src="https://avatars.githubusercontent.com/u/37317008?v=4" width="40" height="40" alt="mengdaoshizhongxinyang">
  </a>
</p>

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg"/>
  </a>
</p>

## Credits

- [Geist UI](https://github.com/geist-org/geist-ui)
- The friend who proposed this idea.
- All contributors and sponsors

## License

[MIT](./LICENSE)
