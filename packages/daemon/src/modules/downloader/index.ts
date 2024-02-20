import { z } from 'zod'
import setPriority from './commands/set-priority.js'
import download from './downloader.js'
import { PinManager } from './pin-manager.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { Provides as Tick } from '@/modules/tick/index.js'
import { extendDatastore } from '@/utils.js'

export const Config = z.object({
  slots: z.number().int().min(1).max(100).default(20)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  rpc: RPC
  tick: Tick
  config: ConfigModule
}

export interface Provides extends Record<string, unknown> {
  pinManager: PinManager
  config: Config
}

const module: Module<Provides, Requires> = async (components) => {
  const c = components.config.get(Config)

  const pinManager = new PinManager({
    pinManager: components.network.pinManager,
    datastore: extendDatastore(components.base.datastore, 'pin-references')
  })

  const context = { pinManager, config: c }

  for (const setupCommand of [setPriority]) {
    setupCommand(context, components)
  }

  components.tick.register(async () => download(context))

  return { components: context }
}

export default module
