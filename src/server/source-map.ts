import { SourceMapConsumer } from '@jridgewell/source-map'
import path from 'path'
import { init, scanSourceMapImportsForSourceContent } from '../../zig'
import { generateImportedBy } from './analyzer-module'
import { slash } from './shared'
import type { ChunkMetadata, ImportedBy } from './trie'

init()

// @jridgewell/source-map cut to reduce the size of the bundle
// Only have sourceContentFor and originalPositionFor methods

export function removeAllParentDirectory(id: string) {
  return id.replace(/^((\.\.\/)+|(\.\.\\)+)/, '')
}

export function calculateImportPath(sourcePath: string, identifierPath: string) {
  if (identifierPath[0] === '.') {
    const base = removeAllParentDirectory(sourcePath)
    const baseDir = path.dirname(base)
    return slash(path.join(baseDir, identifierPath))
  }

  return identifierPath
}

function findCodeFromSourcemap(rawSourcemap: string) {
  const result = scanSourceMapImportsForSourceContent(rawSourcemap)

  return result.map<ChunkMetadata>((entry) => {
    return {
      importedBy: generateImportedBy(
        entry.static.map((i) => calculateImportPath(entry.source, i)),
        entry.dynamic.map((i) => calculateImportPath(entry.source, i))
      ),
      id: removeAllParentDirectory(entry.source)
    }
  })
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

export function pickupMappingsFromCodeStr(
  code: string,
  rawSourcemap: string
) {
  const consumer = new SourceMapConsumer(rawSourcemap)
  const grouped: Record<string, { code: string, importedBy: ImportedBy[] }> = {}
  const files = new Set<string>()
  let line = 1
  let column = 0
  for (let i = 0; i < code.length; i++, column++) {
    const { source } = consumer.originalPositionFor({ line, column })
    if (source != null) {
      const id = removeAllParentDirectory(source)

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
  const originalInfomations = findCodeFromSourcemap(rawSourcemap)

  for (const info of originalInfomations) {
    if (info.id in grouped) {
      grouped[info.id].importedBy = info.importedBy
    }
  }

  return { grouped, files }
}
