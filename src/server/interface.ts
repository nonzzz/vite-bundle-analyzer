import type { ZlibOptions } from 'zlib'
import type { HookHandler, Plugin } from 'vite'
import { noop } from 'foxact/noop'
import { AnalyzerModule } from './analyzer-module'

type RenderChunkFunction = HookHandler<Plugin['renderChunk']>

export type GenerateBundleFunction = HookHandler<Plugin['generateBundle']>

const renderChunk: RenderChunkFunction = noop

const generateBundle: GenerateBundleFunction = noop

export type RenderChunk = Parameters<typeof renderChunk>[1]

export type PluginContext = ThisParameterType<typeof renderChunk>

export type RenderedModule = RenderChunk['modules'][string]

export type OutputBundle = Parameters<typeof generateBundle>[1]

export type OutputAsset = Extract<OutputBundle[0], { type: 'asset' }>

export type OutputChunk = Extract<OutputBundle[0], { type: 'chunk' }>

export type ModuleInfo = NonNullable<ReturnType<PluginContext['getModuleInfo']>>

export type AnalyzerMode = 'static' | 'json' | 'server'

export type DefaultSizes = 'stat' | 'parsed' | 'gzip'

export interface Module {
  label: string
  filename: string
  isEntry: boolean
  statSize: number
  parsedSize: number
  mapSize: number
  gzipSize: number
  source: Array<Module>
  stats: Array<Module>
  imports: Array<string>
  groups: Array<Module>
  isAsset?: boolean
}

export type CustomAnalyzerModule = (analyzeModule: Module[]) => void

export interface BasicAnalyzerPluginOptions {
  summary?: boolean
  analyzerMode?: AnalyzerMode | CustomAnalyzerModule
  reportTitle?: string
  defaultSizes?: DefaultSizes
  gzipOptions?: ZlibOptions
}

export interface AnalyzerPluginOptionsWithServer extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'server'
  analyzerPort?: number | 'auto'
  openAnalyzer?: boolean
}

export interface AnalyzerPluginOptionsWithJson extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'json'
  fileName?: string
}

export interface AnalyzerPluginOptionsWithStatic extends BasicAnalyzerPluginOptions {
  analyzerMode?: 'static'
  analyzerPort?: number | 'auto'
  openAnalyzer?: boolean
  fileName?: string
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
}
