/* eslint-disable no-labels */
import fs from 'fs'
import module from 'module'
import path from 'path'
import url from 'url'
import type { ExportFields } from 'workspace-sieve'
import type { PackageJSONMetadata } from './server/interface'

export function detectPackageManager(workspaceRoot: string) {
  if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock. yaml'))) { return 'pnpm' }
  if (fs.existsSync(path.join(workspaceRoot, 'pnpm-workspace.yaml'))) { return 'pnpm' }
  if (fs.existsSync(path.join(workspaceRoot, 'bun.lock'))) { return 'bun' }
  if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) { return 'yarn' }
  return 'npm'
}

export function getSearchPaths(workspaceRoot: string, packageManager: string): string[] {
  const paths = [
    workspaceRoot,
    process.cwd()
  ]

  paths.push(path.join(workspaceRoot, 'node_modules'))
  paths.push(path.join(process.cwd(), 'node_modules'))

  switch (packageManager) {
    case 'pnpm':
      paths.push(path.join(workspaceRoot, 'node_modules/.pnpm'))
      break

    case 'bun':
      paths.push(path.join(workspaceRoot, 'node_modules/.bun'))
      break
  }

  let currentDir = process.cwd()
  while (currentDir !== path.dirname(currentDir)) {
    paths.push(path.join(currentDir, 'node_modules'))
    currentDir = path.dirname(currentDir)
  }

  return [...new Set(paths)].filter((p) => fs.existsSync(p))
}

type EntryModule = string | ExportFields | undefined

export function resolveEntryPoint(packageRoot: string, name: string) {
  const packageJSONPath = path.join(packageRoot, 'package.json')

  if (!fs.existsSync(packageJSONPath)) {
    throw new Error(`package.json not found for module '${name}' at '${packageRoot}'`)
  }
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8')) as unknown as PackageJSONMetadata

  let entryPoint: EntryModule = packageJSON.module || packageJSON.main
  const isESM = packageJSON.type === 'module'

  if (packageJSON.exports && !entryPoint) {
    entryPoint = packageJSON.exports['.'] || packageJSON.exports['./index'] || packageJSON.exports['./index.js']
    stop: for (;;) {
      if (typeof entryPoint === 'string') { break stop }
      if (entryPoint) {
        if (isESM) {
          entryPoint = entryPoint.import || entryPoint.default
        } else {
          entryPoint = entryPoint.require || entryPoint.default
        }
      } else {
        break stop
      }
    }
  }
  if (!entryPoint) { throw new Error(`Cannot find entry point for module '${name}'`) }
  entryPoint = path.join(packageRoot, entryPoint)
  if (fs.existsSync(entryPoint) && fs.statSync(entryPoint).isFile()) {
    return url.pathToFileURL(entryPoint).href
  }
  throw new Error(`Cannot resolve entry point for package '${name}'`)
}

const _require = module.createRequire(import.meta.url)

export function resolveWithNodeResolution(name: string, fromPath: string) {
  const resolved = _require.resolve(name, { paths: [fromPath] })
  return url.pathToFileURL(resolved).href
}
