import fs from 'fs'
import mri from 'mri'
import path from 'path'
import { x } from 'tinyexec'
import url from 'url'
import { afterAll, describe, expect, it } from 'vitest'
import { OPTIONS } from '../src/cli'

const cliPath = path.join(process.cwd(), 'dist/bin.js')

function execCli(args: string[] = []) {
  return x('node', [cliPath, ...args])
}

const defaultWd = path.join(url.fileURLToPath(new URL('./', import.meta.url)), 'fixtures')

describe('Cli', () => {
  afterAll(() => {
    fs.rmSync(path.join(defaultWd, 'normal', 'dist'), { recursive: true })
  })
  it('normal', async () => {
    const basePath = path.join(defaultWd, 'normal')
    await execCli(['-c', path.join(basePath, 'vite.config.mts'), '-m', 'json'])
    expect(fs.existsSync(path.join(basePath, 'dist', 'stats.json'))).toBe(true)
  })
  it('parse cli args', () => {
    const args: string[] = []
    const argv = mri(args, {
      alias: Object.fromEntries(Object.entries(OPTIONS).map(([key, { alias }]) => [alias, key])),
      default: Object.fromEntries(Object.entries(OPTIONS).map(([key, { default: value }]) => [key, value])),
      boolean: ['open', 'summary']
    })
    for (const key in argv) {
      if (key.length === 1) { continue }
      const opt = OPTIONS[key]
      expect(argv[key]).toBeDefined()
      expect(argv[key]).toEqual(opt.default)
    }
  }, { skip: true })
})
