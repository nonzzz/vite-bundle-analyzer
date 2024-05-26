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
