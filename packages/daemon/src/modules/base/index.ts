import Path from 'path'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createKeyManager } from 'key-manager'
import { z } from 'zod'
import type { Module, RPCCommand } from '@/interface.js'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'
import type { KeyManager } from 'key-manager'
import { isMemory } from '@/utils.js'

const Config = z.object({
  tickInterval: z.number().default(10 * 60),
  storage: z.string().default(':memory:')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> { config: unknown, key: string }

export interface Requires extends Record<string, unknown> {}

export interface Provides extends Record<string, unknown> {
  config: Config
  datastore: Datastore
  blockstore: Blockstore
  keyManager: KeyManager
}

const module: Module<Init, Requires, Provides> = async (_, init) => {
  const config = Config.parse(init.config)
  const keyManager = await createKeyManager(Path.resolve(init.key))

  const datastore = isMemory(config.storage)
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(config.storage, 'datastore'))

  const blockstore = isMemory(config.storage)
    ? new MemoryBlockstore()
    : new FsBlockstore(Path.join(config.storage, 'blockstore'))

  const components = { config, keyManager, datastore, blockstore }
  const commands: RPCCommand[] = []

  return {
    components,
    commands
  }
}

export default module
