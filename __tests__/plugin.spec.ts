import path from 'path'
import fsp from 'fs/promises'
import fs from 'fs'
import test from 'ava'
import { type Logger, build } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from '../dist'
import type { AnalyzerPluginOptions } from '../src/server'

type LoggerMessage = { type: string; message: string }
type FakeLogger = Logger & { messages: LoggerMessage[]; clear: () => void }

const defaultWd = __dirname

const fixturePath = path.join(defaultWd, 'fixtures')
const bundlePath = path.join(defaultWd, 'dist')

function getId() {
  return Math.random().toString(32).slice(2, 10)
}
function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

const createLogger = (): FakeLogger => {
  const messages: LoggerMessage[] = []
  return new Proxy({}, {
    get(target: any, key: string): any {
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

test.after(async () => {
  await fsp.rm(bundlePath, { recursive: true })
})

test.serial('generator JSON', async (t) => {
  const id = await createBuildServer('normal', { analyzerMode: 'json' })
  const statsPath = path.join(id, 'stats.json')
  await sleep(3000)
  t.is(fs.existsSync(statsPath), true)
})

test.serial('generator Static Page', async (t) => {
  const id = await createBuildServer('normal', { analyzerMode: 'static' })
  const analyzerPath = path.join(id, 'stats.html')
  await sleep(3000)
  t.is(fs.existsSync(analyzerPath), true)
})

test.serial('log summary', async (t) => {
  const logger = createLogger()
  await createBuildServer('normal', { analyzerMode: 'json', summary: true }, logger)
  const actual = logger.messages.find(log => log.message.includes('chunks of'))
  t.truthy(!!actual)
})

test.serial('not log summary', async (t) => {
  const logger = createLogger()
  await createBuildServer('normal', { analyzerMode: 'json', summary: false }, logger)
  const actual = logger.messages.some(log => log.message.includes('chunks of'))
  t.is(actual, false)
})
