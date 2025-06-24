# Q & A

### Why do I get empty or incorrect visualizations?

This typically occurs with Rollup or Rolldown when source maps are not properly configured. The analyzer relies heavily on source maps to trace modules back to their original sources.

**For Rollup projects:**

- If using [`rollup-plugin-swc3`](https://github.com/SukkaW/rollup-plugin-swc), verify that `sourceMaps: true` is enabled.When minification is enabled, ensure `sourceMap: true` is also set in the minify options

```js
// rollup.config.js
export default {
  plugins: [
    swc({
      sourceMaps: true,
      minify: {
        sourceMap: true // Important when minification is enabled
      }
    })
  ]
}
```

### Why are bundle sizes different from what I expect?

The analyzer shows multiple size metrics:

- **Stat Size**: Size after transformation and bundling (may appear larger than minified output)
- **Gzip/Brotli size**: Compressed sizes for network transfer

Note that Vite enables minification by default, but the parsed size reflects the pre-minified bundle information from Rollup.

The analyzer doesn't work with my framework
Some Vite-based frameworks (VitePress, Nuxt, etc.) create multiple build instances which can interfere with analysis.

**Solution**: Use server mode for better compatibility:

```js
analyzer({
  analyzerMode: 'static'
})
```

## Design Decisions

Why not use existing tools like Sonda or rollup-plugin-visualizer?
We created this analyzer with specific goals in mind:

### Compared to Sonda:

- Lightweight approach: Our analyzer is designed to be fast and minimal, avoiding heavy dependencies
- Source map focused: Leverages existing source maps rather than implementing complex analysis logic
- Better integration: Native Vite plugin architecture with seamless developer experience

### Compared to rollup-plugin-visualizer:

- Modern UX: Interactive treemap interface with better visual design
- Multi-format support: Better handling of different bundle formats and compression methods
- Framework compatibility: Better support for modern frameworks and build tools

Our philosophy: Build a tool that's powerful yet lightweight, with an elegant user experience that developers actually enjoy using.

## Technical Details

How does source map analysis work?

The analyzer:

1. Reads source map files generated during the build process
2. Traces each bundle chunk back to its original source modules
3. Calculates accurate size metrics by mapping bundle positions to source files
4. Handles module deduplication and chunk splitting analysis

This approach is lightweight because it reuses existing build artifacts rather than re-parsing source code.

### Why is Rolldown support experimental?

Rolldown is still in active development with:

- Different plugin hook behaviors compared to Rollup
- Potential changes in source map generation
- Experimental build pipeline that may affect analysis accuracy

### Getting Help

If you encounter issues not covered here:

1. Check the console: Run with `ANALYZE_DEBUG=true` for detailed logs
2. Verify source maps: Ensure your build generates proper source maps
3. Try different modes: Test with analyzerMode: 'static' or 'json' if server mode fails
4. Open an issue: Provide your build configuration and error details

For feature requests or bug reports, please visit our [GitHub repository](https://github.com/nonzzz/vite-bundle-analyzer/issues).
