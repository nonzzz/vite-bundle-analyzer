import { SourceMapGenerator } from 'source-map'
import { stringToByte } from '../../src/server/shared'
import type { Foam, OutputAsset, OutputChunk } from '../../src/server/interface'

export function createMockStats(chunkName: string, chunk: DeepPartial<OutputChunk | OutputAsset>, expect: Array<DeepPartial<Foam>> | DeepPartial<Foam>) {
  return { chunk, expect, chunkName, sourceMapFileName: chunkName + '.map', map: (chunk as OutputChunk).map } as unknown as
   { chunkName: string, chunk: OutputChunk | OutputAsset, expect: Foam | Foam[], sourceMapFileName: string, map: any }
}

export function getByteLen(code: string) {
  return stringToByte(code).byteLength
}

export function generateSourceMap(originalCode: string, transformedCode: string, fileName: string) {
  const generator = new SourceMapGenerator({
    file: fileName,
    sourceRoot: ''
  })
  let originalLine = 1
  let originalColumn = 0

  const transformedLines = transformedCode.split('\n')
  const originalLines = originalCode.split('\n')

  for (let i = 0; i < transformedLines.length; i++) {
    generator.addMapping({
      generated: { line: i + 1, column: 0 }, 
      original: { line: originalLine, column: originalColumn },
      source: fileName
    })
    originalLine++
    if (originalLines[i]) {
      originalColumn += originalLines[i].length + 1
    }
  }
  generator.setSourceContent(fileName, originalCode)
  return generator.toString()
}
