import test from 'ava'
import type { ExecutionContext } from 'ava'
import { createAnalyzerModule } from '../src/server/analyzer-module'
import type { Foam } from '../src/server/interface'
import { pick } from '../src/server/shared'
import normal from './stats/normal'
import dynamic from './stats/dynamic'

// we aren't calling bundle tool. So the top layer parsed size and stat size is equal the sum of
// modules

function assert(act: Foam, expect: Foam, fields: (keyof Foam)[], t: ExecutionContext<unknown>) {
  const graph = pick(act, fields)
  for (const key in graph) {
    const k = key as keyof typeof graph
    t.is(graph[k], expect[k], `${k} failed`)
  }
}

test('normal analyzer', async (t) => {
  const analyzer = createAnalyzerModule({})
  const { chunk, chunkName, expect } = normal
  analyzer.addModule(chunkName, chunk)
  const foam = await analyzer.processFoamModule()
  if (foam.length > 1) {
    t.fail('normal analyzer process error.')
  }
  const act = foam[0]
  if (Array.isArray(expect)) {
    assert(act, expect[0], ['id', 'label', 'path', 'parsedSize', 'statSize'], t)
  }
})

test('dynamic analyzer', async (t) => {
  const analyzer = createAnalyzerModule({})
  const { chunk, chunkName, expect } = dynamic
  analyzer.addModule(chunkName, chunk)
  const foam = await analyzer.processFoamModule()
  if (foam.length > 1) {
    t.fail('dynamic analyzer process error.')
  }
  const act = foam[0]
  if (!Array.isArray(expect)) {
    assert(act, expect, ['id', 'label', 'path', 'parsedSize', 'statSize'], t)
    assert(act.groups[0], expect.groups[0], ['id', 'label', 'path', 'parsedSize', 'statSize'], t)
  } 
})
