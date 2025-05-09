import fs from 'fs'
import path from 'path'
import { x } from 'tinyexec'
import url from 'url'
import { afterAll, describe, expect, it } from 'vitest'

const cliPath = path.join(process.cwd(), 'dist/cli.js')

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
})
