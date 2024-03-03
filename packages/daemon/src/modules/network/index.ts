import { z } from 'zod'
import addresses from './commands/addresses.js'
import connect from './commands/connect.js'
import connections from './commands/connections.js'
import countPeers from './commands/count-peers.js'
import setupComponents from './setup.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { Provides as Sigint } from '@/modules/sigint/index.js'
import type { Libp2p } from '@libp2p/interface'
import type PinManager from '@organicdesign/db-helia-pin-manager'
import type { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import type { Helia } from 'helia'
import { createLogger } from '@/logger.js'

export const logger = createLogger('network')

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

export interface Requires extends Record<string, unknown> {
  base: Base
  rpc: RPC
  config: ConfigModule
  sigint: Sigint
}

export interface Provides extends Record<string, unknown> {
  libp2p: Libp2p
  helia: Helia
  pinManager: PinManager
  config: Config
  manualBlockBroker: ManualBlockBroker
}

const module: Module<Provides, Requires> = async (components) => {
  const config = components.config.get(Config)

  const context = await setupComponents(components, config)

  for (const setupCommand of [addresses, connect, connections, countPeers]) {
    setupCommand(context, components)
  }

  components.sigint.onInterupt(async () => {
    await context.helia.stop()
    await context.libp2p.stop()
  })

  return context
}

export default module
