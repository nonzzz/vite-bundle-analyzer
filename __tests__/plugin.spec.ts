import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import { build } from 'vite'
import chai from 'chai'
import react from '@vitejs/plugin-react'
import { analyzer } from '../src/server'
import type { AnalyzerPluginOptions } from '../src/server'

const defaultWd = __dirname

const fixturePath = path.join(defaultWd, 'fixtures')
const bundlePath = path.join(defaultWd, 'dist')

function getId() {
  return Math.random().toString(32).slice(2, 10)
}

async function createBuildServer(fixtureName: string, options?: AnalyzerPluginOptions) {
  const entry = path.join(fixturePath, fixtureName)
  const id = getId()
  await build({
    root: entry,
    logLevel: 'silent',
    configFile: false,
    plugins: [react(), analyzer(options)],
    build: {
      outDir: path.join(bundlePath, id)
    }
  })
  return entry
}

describe('Plugin', () => {
  afterEach(async () => {
    await fsp.rm(bundlePath, { recursive: true })
  })
  it('generator JSON', async () => {
    const id = await createBuildServer('normal', { analyzerMode: 'json' })
    const statsPath = path.join(id, 'stats.json')
    chai.assert.isTrue(fs.existsSync(statsPath))
  })
  it('generator Static Page', async () => {
    const id = await createBuildServer('normal', { analyzerMode: 'static' })
    const analyzerPath = path.join(id, 'analyzer.html')
    chai.assert.isTrue(fs.existsSync(analyzerPath))
  })
})
