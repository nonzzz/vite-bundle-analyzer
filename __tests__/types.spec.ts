import { describe, it } from 'vitest'
import { expectTypeOf } from 'vitest'
import type { AllowedMagicType, QueryKind, SendFilterMessage } from '../dist/client.d.ts'
import type { Module } from '../dist/index.d.ts'

describe('Type Tests', () => {
  it('should have correct AllowedMagicType', () => {
    expectTypeOf<AllowedMagicType>().toEqualTypeOf<'graph:click' | 'client:ready' | 'send:ui' | 'send:filter'>()
  })

  it('should have correct QueryKind', () => {
    expectTypeOf<QueryKind>().toEqualTypeOf<'gzip' | 'stat' | 'brotli'>()
  })

  it('should have correct SendFilterMessage interface', () => {
    expectTypeOf<SendFilterMessage>().toExtend<{
      analyzeModule: Module[]
    }>()
  })

  it('should have correct Window global types', () => {
    expectTypeOf<Window['defaultSizes']>().toBeString()
    expectTypeOf<Window['analyzeModule']>().toBeArray()
    expectTypeOf<Window['CUSTOM_SIDE_BAR']>().toBeBoolean()
  })
})
