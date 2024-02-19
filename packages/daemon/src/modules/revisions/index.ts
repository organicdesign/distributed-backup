import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import revisions from './commands/revisions.js'
import setup from './setup.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as FileSystem } from '@/modules/filesystem/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as Network } from '@/modules/network/index.js'

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  groups: Groups
  filesystem: FileSystem
}

export interface Provides extends Record<string, unknown> {}

const module: Module<Init, Requires, Provides> = async (components) => {
  const context = await setup()

  const commands = [
    revisions
  ].map(c => c(context, components))

  return { components: context, commands }
}

export default module
