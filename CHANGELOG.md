## 1.3.1

- Fix watch mode.

## 1.3.0

- Lift the restrictions for static mode in rolldown

## 1.2.4

- Fix where URLs could not be opened when WSL disabled inheritance of Windows paths.

## 1.2.3

- **Static Mode**: `openAnalyzer` now opens HTML reports via file protocol instead of starting a server.

## 1.2.2

Fix ensure parent directory creation for absolute output paths.

### credits

@imink

## 1.2.1

Make type happy.

## 1.2.0

Export client type.

## 1.1.2

Using `@ts-ignore` replace `@ts-nocheck`

## 1.1.1

Fix type export error.

## 1.1.0

Added `pathFormatter` option for advanced path customization.\
You can now provide a custom function to format or normalize module paths in the analysis report, making it easier to adapt the output to your project's structure or display preferences.

## 1.0.0

🎉 **Stable Release** - We're excited to announce the first stable release of vite-bundle-analyzer!

### Highlights

- **Production Ready**: Stable API with full backward compatibility guarantees
- **Enhanced Module Dependencies**: Complete dependency graph visualization with static/dynamic import differentiation
- **Improved Performance**: Optimized client rendering and reduced bundle size
- **Better Developer Experience**: Intuitive UI with context menus, search functionality, and responsive design
- **Comprehensive Platform Support**: Works seamlessly with Vite, Rollup, and Rolldown

### Acknowledgments

Special thanks to all contributors and community members who helped shape this release:
@kricsleo, @a3mitskevich, @urbnjamesmi1, @paulcarroll, @TSmota, @a145789

### What's New in 1.0

- **Dependency Graph Visualization**: View complete module dependency relationships
- **Smart Tooltips**: Hover to see full file paths and detailed module information
- **Enhanced Context Menus**: Right-click for quick actions and navigation
- **Improved Color Coding**: Better visual distinction between different module types
- **Optimized Treemap Rendering**: Smoother interactions and better performance

### What's Next

- Additional bundler support
- Advanced filtering and analysis features

## 0.23.0

- Better client UX.
- Use `parsed` to replace the original `stat`

## 0.22.3

- Fix cli can't work.

## 0.22.2

- Update `squarified` dependency and add support for Magic Trackpad two fingers action.

## 0.22.1

- Update dependencies.
- Optimize context menu rendering position.

## 0.22.0

### Break Changes

- Removed the click on a module to scale the viewport. (use context menu instead)

### Note

- Upgrade `squarified` versions
- Improve client to generate module dependency graph
- Added context menu

## 0.21.0

- Added new `enable` option to control plugin workflow.
- Add new option `include` and `exclude` to filter generated content from the analysis server.

### Note

This is one of the final minor releases before the v1.0 launch. We're focusing on polishing core functionality and enhancing stability in preparation for the upcoming major release.

### credits

@kricsleo

## 0.20.2

Prevent server from running in CI environment.

### credits

@kricsleo

## 0.20.1

- Remove unnecessary logic.

## 0.20.0

- Add rolldown adapter

```ts
// rolldown.config.mts
import { analyzer, unstableRolldownAdapter } from 'vite-bundle-analyzer'

unstableRolldownAdapter(analyzer())
```

## 0.19.0

- Static resources output.
- The `fileName` option now supports passing a function to dynamically generate output filenames. This function receives the build metadata and should return a string.
- Support Rolldown. (And Rolldown Vite)

```ts
import path from 'path'
analyzer({
  fileName: (outputDir) => path.join(outputDir, 'report.html')
})
```

## 0.18.1

- Reduce installer size.

## 0.18.0

- Use mri to replace commander.js

## 0.17.3

- Respect Cli parse.

## 0.17.2

- Fix cli wrong option passing.

## 0.17.1

- Fixed warning not showing as expected. #58
- Non-js files no need to record child nodes.

### credits

@urbnjamesmi1

## 0.17.0

- `Cli` add default config path (`vite.config.ts`)

### credits

@kricsleo

## 0.16.3

- Increase color brightness (Client)
- Improve the smoothness of events (Client)

## 0.16.2

- Fix Safari render crash.

## 0.16.1

- Update Client UI.

## 0.16.0

- Better custom integrate.
- Fix `adapter` type error.
- Support view `brotli` size.
- Display `no-js` file.

## 0.16.0-beta.4

- Fix `adapter` type error.

## 0.16.0-beta.3

Change hook order.

## 0.16.0-beta.2

- Add Brotli size.
- Display no-js files.

## 0.16.0-beta.1

Add more friendly API for integrate.

## 0.15.2

Expose `render` and other methods to better integrate into custom tools.

## 0.15.1

- Revert the recent change to avoid bundling crash. (This usually happends when running mulitple instances.)

## 0.15.0

# Improves

- Support vite6.
- Reduce bundle size.
- Improve plugin integration support

## 0.14.3

Bump client deps.

## 0.14.2

# Patches

- Fix `type='module'` can't work.

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

[now](./imgs/now.gif)

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
