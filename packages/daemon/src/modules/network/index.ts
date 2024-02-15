import { z } from 'zod'
import addresses from './commands/addresses.js'
import connect from './commands/connect.js'
import connections from './commands/connections.js'
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
import type { Helia } from 'helia'
import type { Libp2p } from 'libp2p'
import type { Welo } from 'welo'

const Config = z.object({
  serverMode: z.boolean().default(false),
  private: z.boolean().default(false),
  bootstrap: z.array(z.string()).default([]),
  storage: z.string().default(':memory:'),
  addresses: z.array(z.string()).default([
    '/ip4/127.0.0.1/tcp/0',
    '/ip4/127.0.0.1/tcp/0/ws'
  ])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
}

export interface Provides extends Record<string, unknown> {
  welo: Welo
  libp2p: Libp2p
  helia: Helia
  groups: Groups
  pinManager: PinManager
}

const module: Module<Init, Requires, Provides> = async (components, init) => {
  const config = Config.parse(init.config)

  const context = await setupComponents(components, config)

  const commands = [
    addresses,
    connect,
    connections,
    createGroup,
    id,
    joinGroup,
    listGroups,
    sync
  ].map(c => c.apply(null, [context, components]))

  return { commands, components: context }
}

export default module
