import path from 'path'
import url from 'url'
import fs from 'fs'
import { x } from 'tinyexec'
import { describe, expect, it } from 'vitest'

const cliPath = path.join(process.cwd(), 'dist/cli.js')

function execCli(args: string[] = []) {
  return x('node', [cliPath, ...args])
}

const defaultWd = path.join(url.fileURLToPath(new URL('./', import.meta.url)), 'fixtures')

describe('Cli', () => {
  it('must need a config ', async () => {
    const { stderr } = await execCli()
    expect(stderr).toBe("error: required option '-c, --config <path>' not specified\n")
  })
  it('normal', async () => {
    const basePath = path.join(defaultWd, 'normal')
    await execCli(['-c', path.join(basePath, 'vite.config.mts'), '-m', 'json'])
    expect(fs.existsSync(path.join(basePath, 'dist', 'stats.json'))).toBe(true)
  })
})
