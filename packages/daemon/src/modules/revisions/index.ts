import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import revisions from './commands/revisions.js'
import setup from './setup.js'
import type { Revisions } from './revisions.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Provides as FileSystem } from '@/modules/filesystem/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { CID } from 'multiformats/cid'

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  groups: Groups
  filesystem: FileSystem
  rpc: RPC
  config: ConfigModule
}

export interface Provides extends Record<string, unknown> {
  getRevisions (group: CID): Revisions | null
}

const module: Module<Provides, Requires> = async (components) => {
  const context = await setup(components)

  for (const setupCommand of [revisions]) {
    setupCommand(context, components)
  }

  return context
}

export default module
