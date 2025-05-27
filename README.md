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

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/nonzzz/vite-bundle-analyzer@latest/imgs/now.gif" width="640" height="320" />
</p>

> [!WARNING]
> Vite's enable minify by default.There for you will see that the parsed size is larger than actual size.This is because the bundle info
> provide by rollup isn't compressed.(If you care about this problem you can choose anothr plugins.)
> rolldown-vite is an experimental tool, and now is supported :D

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
// If you're using rolldown you can import 'unstableRolldownAdapter' from package.
```

## Options

| params         | type                                          | default       | description                                                                      |
| -------------- | --------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `analyzerMode` | `server\|static\|json\|function`              | `server`      | In `server` will create a static server to preview.                              |
| `fileName`     | `string\| function`                           | `stats`       | The name of the static product.（No suffix name）                                |
| `reportTitle`  | `string`                                      | `plugin name` | Report website title.                                                            |
| `gzipOptions`  | `Record<string,any>`                          | `{}`          | Compression options. (Details see `zlib module`)                                 |
| `analyzerPort` | `number\|'auto'`                              | `8888`        | static server port.                                                              |
| `openAnalyzer` | `boolean`                                     | `true`        | Open the static website. (Only works on `analyzerMode` is `server` or `static` ) |
| `defaultSizes` | `stat\|parsed\|gzip\brotil`                   | `stat`        | The default type selected in the client page                                     |
| `summary`      | `boolean`                                     | `true`        | Show full chunk info to stdout.                                                  |
| `enabled`      | `boolean`                                     | `true`        | Whether to enable this plugin.                                                   |
| `include`      | `string \| RegExp \| Array<string \| RegExp>` | `[]`          | Include all assets matching any of these conditions.                             |
| `exclude`      | `string \| RegExp \| Array<string \| RegExp>` | `[]`          | Exclude all assets matching any of these conditions.                             |

## ClI

This plugin provides cli util `analyze`. Add --help to check actual options. It can be used like:

```bash
$ analyze
```

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
  <a href="https://github.com/a3mitskevich">
    <img src="https://avatars.githubusercontent.com/u/77048647?v=4&s=40" width="40" height="40" alt="Aleksandr Mitskevich">
  </a>
  <a href="https://github.com/mengdaoshizhongxinyang">
    <img src="https://avatars.githubusercontent.com/u/37317008?v=4" width="40" height="40" alt="mengdaoshizhongxinyang"  />
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

### For vite based framework or library!!!

When using frameworks built on top of Vite (such as VitePress, Remix, or Qwik), these tools typically run multiple Vite instances during the build phase. For accurate analysis results, we recommend setting `analyzerMode` to `server`.

If you set `analyzerMode` to `static` or `json`, the analysis results may be incomplete or inaccurate. For example, with VitePress, some build artifacts might be removed during the build process due to concurrent build operations.

### Integrated

Integrate this plugin into your rollup/vite/rolldown tool. The following is a list of exposed APIs.

```ts
// For integrate it as custom analyzer

// Returns the HTML string
declare function renderView(analyzeModule: Module[], options: RenderOptions): Promise<string>

// Create a static living server.
declare function createServer(): CreateServerContext

declare function openBrowser(address: string): void

declare function injectHTMLTag(options: InjectHTMLTagOptions): string

declare class SSE {
  private activeStreams
  serverEventStream(req: http.IncomingMessage, res: http.ServerResponse): void
  sendEvent(event: string, data: string): void
  private removeStream
}

// example

const server = createServer()

server.get('/', async (c) => {
  let html = await renderView(data, { title: 'Vite Bundle Analyzer', mode: 'parsed' })
  c.res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
  c.res.write(html)
  c.res.end()
})

server.listen(3000)

// If you want set this plugin in rollup output plugins. you should wrapper plugin `generateBundle` by your self.

const { api, generateBundle, ...rest } = analyzer()

const data = []

const myAnalyzerPlugin = {
  ...reset,
  api,
  async generateBundle(...args) {
    await generateBundle.apply(this, args)
    data.push(api.processModule())
  }
}

// .... your logic
```

### Others

- [ROLLDOWN](./ROLLDOWN.md)
- [CHANGLOG](./CHANGELOG.md)

### Credits

- [Geist UI](https://github.com/geist-org/geist-ui)
- The friend who proposed this idea.
- Every contributor & Sponsors.

### LICENSE

[MIT](./LICENSE)
