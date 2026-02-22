import path from 'path'
import { dispose, init, parse, pickupMappingsFromCode, scanSourceMapImportsForSourceContent } from '../../zig'
import { generateImportedBy } from './analyzer-module'
import { slash } from './shared'
import type { ImportedBy } from './trie'

init()

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

export function pickupMappingsFromCodeStr(
  code: string,
  rawSourcemap: string
) {
  try {
    parse(rawSourcemap)

    const { grouped: rawGrouped } = pickupMappingsFromCode(code)

    const imports = scanSourceMapImportsForSourceContent()

    const grouped: Record<string, { code: string, importedBy: ImportedBy[] }> = {}
    const files = new Set<string>()

    for (const [rawSource, data] of Object.entries(rawGrouped)) {
      const cleanId = removeAllParentDirectory(rawSource)
      grouped[cleanId] = {
        code: data.code,
        importedBy: []
      }
      files.add(cleanId)
    }

    for (const entry of imports) {
      const cleanId = removeAllParentDirectory(entry.source)
      if (grouped[cleanId]) {
        grouped[cleanId].importedBy = generateImportedBy(
          entry.static.map((i) => calculateImportPath(entry.source, i)),
          entry.dynamic.map((i) => calculateImportPath(entry.source, i))
        )
      }
    }

    return { grouped, files }
  } finally {
    dispose()
  }
}
