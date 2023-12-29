import type { ZlibOptions } from 'zlib'
import type { HookHandler, Plugin } from 'vite'
import { noop } from 'foxact/noop'

type RenderChunkFunction = HookHandler<Plugin['renderChunk']>

type GenerateBundle = HookHandler<Plugin['generateBundle']>

const renderChunk: RenderChunkFunction = noop

const generateBundle: GenerateBundle = noop

export type RenderChunk = Parameters<typeof renderChunk>[1]

export type PluginContext = ThisParameterType<typeof renderChunk>

export type RenderedModule = RenderChunk['modules'][string]

export type OutputBundle = Parameters<typeof generateBundle>[1]

export type OutputChunk = Extract<OutputBundle[0], { type: 'chunk' }>

export type ModuleInfo = NonNullable<ReturnType<PluginContext['getModuleInfo']>>

export type AnalyzerMode = 'static' | 'json' | 'server'
// `vite-plugin-analyzer` reports three values of size. (Same as `webpack-bundle-analyzer`)
// But still have to retell it here
// `stat` This is the `input` size of your file, before any transformations like minification.
// `parsed` This is the `output` size of your bundle files. (In vite's, vite will using terser or esbuild to minified size of your code.)
// `gzip` This is the size of running the parsed bundles/modules through gzip compression.
export type DefaultSizes = 'stat' | 'parsed' | 'gzip'

export interface Foam {
  id: string
  label: string
  isEntry: boolean
  path: string
  statSize: number
  parsedSize: number
  mapSize: number
  gzipSize: number
  source: Array<Foam>
  stats: Array<Foam>
  imports: Array<string>
  groups: Array<Foam>
  isAsset?: boolean
}

export interface BasicAnalyzerPluginOptions {
  summary?: boolean,
  analyzerMode?: AnalyzerMode
  reportTitle?: string
  gzipOptions?: ZlibOptions
}

export interface AnalyzerPluginOptionsWithServer extends BasicAnalyzerPluginOptions {
  analyzerMode: 'server'
  analyzerPort?: number | 'atuo'
  openAnalyzer?: boolean
}

export interface AnalyzerPluginOptionsWithStatic extends BasicAnalyzerPluginOptions {
  analyzerMode: 'static' | 'json'
  fileName?: string
}

export type AnalyzerPluginOptions = AnalyzerPluginOptionsWithServer | AnalyzerPluginOptionsWithStatic
