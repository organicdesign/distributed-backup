import createGroup from './commands/create-group.js'
import id from './commands/id.js'
import joinGroup from './commands/join-group.js'
import listGroups from './commands/list-groups.js'
import sync from './commands/sync.js'
import setupComponents from './setup.js'
import type { Groups } from './groups.js'
import type { PinManager } from './pin-manager.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Welo } from 'welo'

export interface Init extends Record<string, unknown> {}

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
}

export interface Provides extends Record<string, unknown> {
  welo: Welo
  groups: Groups
  pinManager: PinManager
}

const module: Module<Init, Requires, Provides> = async (components) => {
  const context = await setupComponents(components)

  const commands = [
    createGroup,
    joinGroup,
    listGroups,
    sync,
    id
  ].map(c => c(context, components))

  return { commands, components: context }
}

export default module
