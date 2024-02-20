import createGroup from './commands/create-group.js'
import id from './commands/id.js'
import joinGroup from './commands/join-group.js'
import listGroups from './commands/list-groups.js'
import sync from './commands/sync.js'
import setupComponents from './setup.js'
import type { EntryTracker } from './entry-tracker.js'
import type { Groups } from './groups.js'
import type { Module, KeyvalueDB } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { Welo } from 'welo'

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  rpc: RPC
}

export interface Provides extends Record<string, unknown> {
  welo: Welo
  groups: Groups
  getTracker(database: KeyvalueDB): EntryTracker
}

const module: Module<Provides, Requires> = async (components) => {
  const context = await setupComponents(components)

  for (const setupCommand of [
    createGroup,
    joinGroup,
    listGroups,
    sync,
    id
  ]) {
    setupCommand(context, components)
  }

  return { components: context }
}

export default module
