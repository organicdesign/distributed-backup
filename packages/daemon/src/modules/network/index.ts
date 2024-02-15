import { z } from 'zod'
import addresses from './commands/addresses.js'
import connect from './commands/connect.js'
import connections from './commands/connections.js'
import setupComponents from './setup.js'
import type { PinManager } from './pin-manager.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Helia } from 'helia'
import type { Libp2p } from 'libp2p'

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

export interface Init extends Record<string, unknown> {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
}

export interface Provides extends Record<string, unknown> {
  libp2p: Libp2p
  helia: Helia
  pinManager: PinManager
  config: Config
}

const module: Module<Init, Requires, Provides> = async (components, init) => {
  const config = Config.parse(init.config)

  const context = await setupComponents(components, config)

  const commands = [
    addresses,
    connect,
    connections
  ].map(c => c(context, components))

  return { commands, components: context }
}

export default module
