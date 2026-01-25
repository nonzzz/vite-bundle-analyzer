export interface SourceMapStruct {
  version: number
  file: string
  sources: string[]
  names: string[]
  mappings: string
  sourceRoot?: string
  sourcesContent?: (string | null)[]
}
