import { Options } from 'tsup'

export const tsup: Options = {
  entry: ['src/server/index.ts'],
  dts: true,
  format: ['esm', 'cjs']
}
