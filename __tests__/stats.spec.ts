import { describe, expect, it } from 'vitest'
import { createAnalyzerModule } from '../src/server/analyzer-module'
import type { Module, PluginContext } from '../src/server/interface'
import { pick } from '../src/shared'

import { createMockStats } from './stats/helper'
import normal from './stats/normal'

const mockRollupContext = <PluginContext> {}

function assert(act: Module, exp: Module, fields: (keyof Module)[]) {
  const graph = pick(act, fields)
  for (const key in graph) {
    const k = key as keyof typeof graph
    expect(graph[k]).toEqual(exp[k])
  }
}

async function runStatTest(data: ReturnType<typeof createMockStats>) {
  const analyzerModule = createAnalyzerModule()
  const { chunk, chunkName, expect, sourceMapFileName, map } = data
  analyzerModule.setupRollupChunks({ [chunkName]: { ...chunk, fileName: chunkName }, [sourceMapFileName]: { source: map } as any })
  analyzerModule.installPluginContext(mockRollupContext)
  await analyzerModule.addModule({ ...chunk, fileName: chunkName }, sourceMapFileName)
  const module = analyzerModule.processModule()
  if (Array.isArray(expect)) {
    assert(module[0], expect[0], Object.keys(expect[0]) as (keyof Module)[])
  }
}

describe('Stats', () => {
  it('normal', async () => {
    await runStatTest(normal)
  })
})
