import type { Foam, OutputChunk } from '../../src/server/interface'

export function createMockStats(chunkName: string, chunk: DeepPartial<OutputChunk>, expect: Array<DeepPartial<Foam>> | DeepPartial<Foam>) {
  return { chunk, expect, chunkName } as unknown as { chunkName: string, chunk: OutputChunk, expect: Foam | Foam[] }
}

export function getByteLen(code: string) {
  return Buffer.from(code, 'utf8').byteLength
}
