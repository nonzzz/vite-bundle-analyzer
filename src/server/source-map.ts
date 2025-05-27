import { SourceMapConsumer } from '@jridgewell/source-map'
import path from 'path'
import { generateImportedBy } from './analyzer-module'
import { byteToString } from './shared'
import type { ChunkMetadata, ImportedBy } from './trie'

// @jridgewell/source-map cut to reduce the size of the bundle
// Only have sourceContentFor and originalPositionFor methods

export function resolveRelativePath(source: string, workspaceRoot: string) {
  if (source[0] === '.') {
    return path.resolve(workspaceRoot, source)
  }
  return source
}

function findCodeFromSourcemap(consumer: SourceMapConsumer, workspaceRoot: string) {
  return consumer.sources.reduce((acc, cur) => {
    if (cur) {
      const code = consumer.sourceContentFor(cur, true)
      if (code) {
        const { staticImports, dynamicImports } = scanImportStatments(code)
        acc.push({
          id: cur,
          code,
          importedBy: generateImportedBy(
            staticImports.map((i) => resolveRelativePath(i, workspaceRoot)),
            dynamicImports.map((i) => resolveRelativePath(i, workspaceRoot))
          )
        })
      }
    }
    return acc
  }, [] as Array<ChunkMetadata>)
}

export function pickupContentFromSourcemap(rawSourcemap: string, workspaceRoot: string) {
  if (!rawSourcemap) { return [] }
  const consumer = new SourceMapConsumer(rawSourcemap)
  const result = findCodeFromSourcemap(consumer, workspaceRoot)
  return result
}

export function scanImportStatments(code: string) {
  const staticImports = []
  const dynamicImports = []
  const staticRegex = /import\s+(?:(?:[^{}*'"\s,]+)\s*,?\s*)?(?:{(?:[^{}]*)})?\s*from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = staticRegex.exec(code)) !== null) {
    staticImports.push(match[1])
  }
  const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = dynamicRegex.exec(code)) !== null) {
    dynamicImports.push(match[1])
  }
  return { staticImports, dynamicImports }
}

export function pickupMappingsFromCodeBinary(
  bytes: Uint8Array,
  rawSourcemap: string,
  workspaceRoot: string,
  formatter: (id: string) => string
) {
  const consumer = new SourceMapConsumer(rawSourcemap)
  //  { code: string, importedBy: ImportedBy[] }
  const grouped: Record<string, { code: string, importedBy: ImportedBy[] }> = {}
  const files = new Set<string>()
  let line = 1
  let column = 0
  const code = byteToString(bytes)
  for (let i = 0; i < code.length; i++, column++) {
    const { source } = consumer.originalPositionFor({ line, column })
    if (source != null) {
      const id = formatter(source)

      const char = code[i]

      if (!(id in grouped)) {
        grouped[id] = { code: '', importedBy: [] }
        grouped[id].code = ''
      }
      grouped[id].code += char
      files.add(id)
    }

    if (code[i] === '\n') {
      line += 1
      column = -1
    }
  }
  const originalInfomations = findCodeFromSourcemap(consumer, workspaceRoot).map((info) => ({ ...info, id: formatter(info.id) }))

  for (const info of originalInfomations) {
    if (info.id in grouped) {
      grouped[info.id].importedBy = info.importedBy
    }
  }

  return { grouped, files }
}
