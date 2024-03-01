import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import setupSneakernetReceive from './commands/sneakernet-receive.js'
import setupSneakernetSend from './commands/sneakernet-send.js'
import { Sneakernet } from './sneakernet.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { Datastore } from 'interface-datastore'
import { createLogger } from '@/logger.js'
import { extendDatastore } from '@/utils.js'

export const logger = createLogger('sneakernet')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  groups: Groups
  base: Base
  rpc: RPC
  network: Network
}

export interface Provides extends Record<string, unknown> {
  peerData: Datastore
  sneakernet: Sneakernet
}

const module: Module<Provides, Requires> = async (components) => {
  const peerData = extendDatastore(components.base.datastore, 'sneakernet')
  const sneakernet = new Sneakernet(components, peerData)
  const context = { peerData, sneakernet }

  for (const setupCommand of [setupSneakernetSend, setupSneakernetReceive]) {
    setupCommand(context, components)
  }

  return context
}

export default module
