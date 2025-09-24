import type { FilterPattern } from '@rollup/pluginutils'
import type { HookHandler, Plugin } from 'vite'
import type { BrotliOptions, ZlibOptions } from 'zlib'
import { AnalyzerModule } from './analyzer-module'

type RenderChunkFunction = NonNullable<HookHandler<Plugin['renderChunk']>>

export type GenerateBundleFunction = NonNullable<HookHandler<Plugin['generateBundle']>>

export type RenderChunk = Parameters<RenderChunkFunction>[1]

export type PluginContext = ThisParameterType<RenderChunkFunction>

export type RenderedModule = RenderChunk['modules'][string]

export type OutputBundle = Parameters<GenerateBundleFunction>[1]

export type OutputAsset = Extract<OutputBundle[0], { type: 'asset' }>

export type OutputChunk = Extract<OutputBundle[0], { type: 'chunk' }>

export type ModuleInfo = NonNullable<ReturnType<PluginContext['getModuleInfo']>>

export type AnalyzerMode = 'static' | 'json' | 'server'

export type DefaultSizes = 'stat' | 'gzip' | 'brotli'

export interface Module {
  label: string
  filename: string
  isEntry: boolean
  parsedSize: number
  mapSize: number
  gzipSize: number
  brotliSize: number
  source: Array<Module>
  stats: Array<Module>
  imports: Array<string>
  groups: Array<Module>
  isAsset?: boolean
}

export type CustomAnalyzerModule = (analyzeModule: Module[]) => void

export type PathFormatter = (path: string, defaultWD: string) => string

export interface BasicAnalyzerPluginOptions {
  enabled?: boolean
  summary?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
  analyzerMode?: AnalyzerMode | CustomAnalyzerModule
  reportTitle?: string
  defaultSizes?: DefaultSizes
  gzipOptions?: ZlibOptions
  brotliOptions?: BrotliOptions
  pathFormatter?: PathFormatter
}

export interface AnalyzerPluginOptionsWithServer extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'server'
  analyzerPort?: number | 'auto'
  openAnalyzer?: boolean
}

export type FileNameDesc = (outputDir: string) => string

export interface AnalyzerPluginOptionsWithJson extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'json'
  fileName?: string | FileNameDesc
}

export interface AnalyzerPluginOptionsWithStatic extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'static'
  analyzerPort?: number | 'auto'
  openAnalyzer?: boolean
  fileName?: string | FileNameDesc
}

export interface AnalyzerPluginOptionsWithCustom extends BasicAnalyzerPluginOptions {
  analyzerMode: CustomAnalyzerModule
}

export type AnalyzerPluginOptions =
  | AnalyzerPluginOptionsWithServer
  | AnalyzerPluginOptionsWithStatic
  | AnalyzerPluginOptionsWithJson
  | AnalyzerPluginOptionsWithCustom

export interface AnalyzerStore {
  analyzerModule: AnalyzerModule
  lastSourcemapOption: boolean
  hasSetupSourcemapOption: boolean
  pluginOptions: AnalyzerPluginOptions
  preferLivingServer: boolean
  preferSilent: boolean
}

export interface ExportFields {
  import?: string
  require?: string
  default?: string
}

export interface PackageJSONMetadata {
  type: 'commonjs' | 'module'
  main?: string
  module?: string
  exports?: Record<string, ExportFields | string>
  [prop: string]: unknown
}

export interface AnalyzerPluginInternalAPI {
  store: AnalyzerStore
  processModule(): Module[]
}
