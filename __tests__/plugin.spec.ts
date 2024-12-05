import fs from 'fs'
import { create, destroy } from 'memdisk'
import path from 'path'

import react from '@vitejs/plugin-react'
import { type Logger, build } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'
import { analyzer } from '../dist'
import type { AnalyzerPluginOptions } from '../src/server'

type LoggerMessage = { type: string, message: string }
type FakeLogger = Logger & { messages: LoggerMessage[], clear: () => void }

const defaultWd = path.dirname(new URL(import.meta.url).pathname)

const fixturePath = path.join(defaultWd, 'fixtures')

const bundlePath = create.sync('vite-bundle-analyzer', 64 * 1024 * 1024, { quiet: false })

function getId() {
  return Math.random().toString(32).slice(2, 10)
}
function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

const createLogger = (): FakeLogger => {
  const messages: LoggerMessage[] = []
  return new Proxy({}, {
    get(target: unknown, key: string): unknown {
      if (key === 'messages') {
        return messages
      }
      if (['clearScreen', 'hasErrorLogged'].includes(key)) {
        return () => false
      }
      return (message: string) => {
        messages.push({ type: key, message })
      }
    }
  }) as FakeLogger
}

async function createBuildServer(
  fixtureName: string,
  options?: AnalyzerPluginOptions,
  logger?: FakeLogger
) {
  const entry = path.join(fixturePath, fixtureName)
  const id = getId()
  const outDir = path.join(bundlePath, id)
  await build({
    root: entry,
    configFile: false,
    logLevel: logger ? 'info' : 'silent',
    plugins: [react(), analyzer(options)],
    build: {
      outDir
    },
    customLogger: logger
  })
  return outDir
}

describe('Plugin', () => {
  afterAll(() => {
    destroy.sync(bundlePath, { quiet: false })
  })
  it('generator JSON', async () => {
    const id = await createBuildServer('normal', { analyzerMode: 'json' })
    const statsPath = path.join(id, 'stats.json')
    await sleep(3000)
    expect(fs.existsSync(statsPath)).toBeTruthy()
  })
  it('generator Static Page', async () => {
    const id = await createBuildServer('normal', { analyzerMode: 'static' })
    const analyzerPath = path.join(id, 'stats.html')
    await sleep(3000)
    expect(fs.existsSync(analyzerPath)).toBeTruthy()
  })
  it('log summary', async () => {
    const logger = createLogger()
    await createBuildServer('normal', { analyzerMode: 'json', summary: true }, logger)
    const actual = logger.messages.find((log) => log.message.includes('chunks of'))
    expect(!!actual).toBeTruthy()
  })
  it('not log summary', async () => {
    const logger = createLogger()
    await createBuildServer('normal', { analyzerMode: 'json', summary: false }, logger)
    const actual = logger.messages.some((log) => log.message.includes('chunks of'))
    expect(actual).toBeFalsy()
  })
})
