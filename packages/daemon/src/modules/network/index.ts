import { z } from 'zod'
import addresses from './commands/addresses.js'
import connect from './commands/connect.js'
import connections from './commands/connections.js'
import createGroup from './commands/create-group.js'
import id from './commands/id.js'
import joinGroup from './commands/join-group.js'
import listGroups from './commands/list-groups.js'
import sync from './commands/sync.js'
import setup from './setup.js'
import type { Groups } from './groups.js'
import type { PinManager } from './pin-manager.js'
import type { Module } from '@/interface.js'
import type { Helia } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'
import type { KeyManager } from 'key-manager'
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

export type Init = void

export type Requires = {
  config: Config
  datastore: Datastore
  blockstore: Blockstore
  keyManager: KeyManager
}

export type Provides = {
  welo: Welo
  libp2p: Libp2p
  helia: Helia
  groups: Groups
  pinManager: PinManager
}

const module: Module<typeof Config, Init, Requires, Provides> = {
  Config,

  commands: [
    addresses,
    connect,
    connections,
    createGroup,
    id,
    joinGroup,
    listGroups,
    sync
  ],

  setup
}

export default module
