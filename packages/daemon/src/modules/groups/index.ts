import { z } from 'zod'
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

const Config = z.object({
  storage: z.string().default(':memory:')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
}

export interface Provides extends Record<string, unknown> {
  welo: Welo
  groups: Groups
  pinManager: PinManager
}

const module: Module<Init, Requires, Provides> = async (components, init) => {
  const config = Config.parse(init.config)
  const context = await setupComponents(components, config)

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
