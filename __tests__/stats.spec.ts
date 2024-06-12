import test from 'ava'
import type { ExecutionContext } from 'ava'
import { createAnalyzerModule } from '../src/server/analyzer-module'
import { pick } from '../src/shared'
import type { Module, PluginContext } from '../src/server/interface'

import { createMockStats } from './stats/helper'
import normal from './stats/normal'

const mockRollupContext = <PluginContext> {
  resolve(...args: any) {
    return { id: args[0] } as any
  }
}

function assert(act: Module, expect: Module, fields: (keyof Module)[], t: ExecutionContext<unknown>) {
  const graph = pick(act, fields)
  for (const key in graph) {
    const k = key as keyof typeof graph
    t.is(graph[k], expect[k], `${k} failed`)
  }
}

async function runStatTest(data: ReturnType<typeof createMockStats>, t: ExecutionContext<unknown>) {
  const analyzerModule = createAnalyzerModule()
  const { chunk, chunkName, expect, sourceMapFileName, map } = data
  analyzerModule.setupRollupChunks({ [chunkName]: { ...chunk, fileName: chunkName }, [sourceMapFileName]: { source: map } as any })
  analyzerModule.installPluginContext(mockRollupContext)
  await analyzerModule.addModule({ ...chunk, fileName: chunkName }, sourceMapFileName)
  const module = analyzerModule.processModule()
  if (Array.isArray(expect)) {
    assert(module[0], expect[0], Object.keys(expect[0]) as (keyof Module)[], t)
  }
}

test('normal', async (t) => {
  await runStatTest(normal, t)
})
