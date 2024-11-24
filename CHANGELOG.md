## 0.14.1

# Patches

- Fix error shebang.

## 0.14.0

# Feature & Improves

- Add a simple cli tool. use like:

```bash
$ analyze -c ./vite.config.ts
```

- Adjust treemap background color

## 0.13.1

# Patches

- Fix the fuck vitepress static generator can't work!!!

## 0.13.0

# Major

Replace `@carrotsearch/foamtree` with `squarified`. For some reason i think the two library are similar. (And the new one can reduce 200kb)
And the new library can better customize the function.

Before `v0.13.0` the client look like [classic](./imgs/classic.gif)

The new client

[now](./imgs/now.png)

## 0.12.1

Better debug log info.

## 0.12.0

# Improves

- Minimum support for `vite@3.1.0`.

## 0.11.1

# Patches

- Fix #38

## 0.11.0

# Improves & Features

- Add new option `defaultSizes`. #19
- Static mode support generating living server.(This version will open the client automatically, If you don't want please set `openAnalyzer` as `false`.) #37

## 0.10.6

- Make default options happy.

### credits

@a145789

## 0.10.5

- Reduce debug info package size.
- Makesure tool can be work.

## 0.10.4

- Add debug info.

## 0.10.3

# Patches

- Fix static report does not work. #29

## 0.10.2

# Patches

- Respect output options.

## 0.10.1

# Patches

- Fix server mode should ensure the safe port.

## 0.10.0

# Improve

- Using `@jridgewell/source-map` replace `source-map`. It can reduce 200kb at install stage.
- Perf client rendering logic.

## 0.9.4

# Patches

- Fix the problem of exit of generate task.

### credits

@paulcarroll

## 0.9.3

# Improve

- Reduce package size.

# Patches

- Fix counting size should skip unknown assets.
- Fix `openAnalyzer` can't work on WSL/WSL2.

## 0.9.2

- Reduce package size.

## 0.9.1

# Patches

- Fix use absolute path for working directory. #17

### credits

@TSmota

## 0.9.0

# Features

- Add rollup adapter.

```js
import { adapter, analyzer } from 'vite-bundle-analyzer'

plugins: ;
;[adapter(analyzer())]
```

## 0.8.3

# Patches

- Fix the possible deadlock when generating stats.

## 0.8.2

# Patches

- Fix `analyzerPort` typo.

## 0.8.1

# Patches

- Using javaScript String index to computing sourcemap.

## 0.8.0

# Improve & Features

- Now file import with query suffix(Like worker and etc) can be collect.
- Module size nearly the actullay size more.
- Remove collect rest module size anymore.

## 0.7.0

# Improve

- Sub module render by chunk size. #14

## 0.6.1

# Patches

- Fix tree-map error deps.

## 0.6.0

# Improve & Features

- Support `summary` option details see #10.

### credits

@a3mitskevich

## 0.5.0

# Imporve & Features

- Remove unnecessary assets or chunk info.
- parsed and gzip size closer to the actual size.
- Modify the data struct for `stats.json`.
- Full details see #9.

## 0.4.0

# Improve

- Reduce package size.(Three quarters).

## 0.3.0

# Features

- Client Add Search function. #6

### credits

@a3mitskevich

## 0.2.0

# Improve & Features

- Client Add Filter by entrypoints.
- Perf client side-bar styles.

# Minor

- Changed output target to `build.outDir` by default.

### Credits

@a3mitskevich @nonzzz

## 0.1.0

# Imrpove & Features

This version is a stable version that implements most of the functions of `webpack-bundle-analyzer`.
Provide a more streamlined configuration.

## 0.0.1

First version.
