import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import test from 'ava'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from '../dist'
import type { AnalyzerPluginOptions } from '../src/server'

const defaultWd = __dirname

const fixturePath = path.join(defaultWd, 'fixtures')
const bundlePath = path.join(defaultWd, 'dist')

function getId() {
  return Math.random().toString(32).slice(2, 10)
}
function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

async function createBuildServer(fixtureName: string, options?: AnalyzerPluginOptions) {
  const entry = path.join(fixturePath, fixtureName)
  const id = getId()
  const outDir = path.join(bundlePath, id)
  await build({
    root: entry,
    logLevel: 'silent',
    configFile: false,
    plugins: [react(), analyzer(options)],
    build: {
      outDir
    }
  })
  return outDir
}

test.after(async () => {
  await fsp.rm(bundlePath, { recursive: true })
})

test('generator JSON', async (t) => {
  const id = await createBuildServer('normal', { analyzerMode: 'json' })
  const statsPath = path.join(id, 'stats.json')
  await sleep(3000)
  t.is(fs.existsSync(statsPath), true)
})

test('generator Static Page', async (t) => {
  const id = await createBuildServer('normal', { analyzerMode: 'static' })
  const analyzerPath = path.join(id, 'stats.html')
  await sleep(3000)
  t.is(fs.existsSync(analyzerPath), true)
})
