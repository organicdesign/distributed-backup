import { z } from 'zod'
import * as addresses from './commands/addresses.js'
import * as connect from './commands/connect.js'
import * as connections from './commands/connections.js'
import * as createGroup from './commands/create-group.js'
import * as id from './commands/id.js'
import * as joinGroup from './commands/join-group.js'
import * as listGroups from './commands/list-groups.js'
import * as sync from './commands/sync.js'
import type { Module } from '@/interface.js';
import type { Welo } from 'welo'
import type { Libp2p } from 'libp2p'

const module: Module<{}, {}, { welo: Welo, libp2p: Libp2p}> = {
  Config: z.object({
	  serverMode: z.boolean().default(false),
	  private: z.boolean().default(false),
	  bootstrap: z.array(z.string()).default([]),
	  addresses: z.array(z.string()).default([
	    '/ip4/127.0.0.1/tcp/0',
	    '/ip4/127.0.0.1/tcp/0/ws'
	  ])
  }),

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

  setup: () => () => ({
    libp2p: null as unknown as Libp2p,
    welo: null as unknown as Welo
  })
}

export default module

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>
