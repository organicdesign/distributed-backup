import * as generateConfig from './commands/generate-config.js'
import * as generateKeys from './commands/generate-keys.js'
import type { Options } from 'yargs'

export default [
  generateKeys,
  generateConfig
] as unknown as Array<{
  desc: string
  command: string
  builder: Record<string, Options>
  handler(argc: Record<string, unknown>): void
}>
