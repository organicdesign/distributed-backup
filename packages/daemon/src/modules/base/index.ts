import Path from 'path'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createKeyManager } from 'key-manager'
import { z } from 'zod'
import type { Module } from '@/interface.js'
import type { Provides as Argv } from '@/modules/argv/index.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'
import type { KeyManager } from 'key-manager'
import { isMemory } from '@/utils.js'

const Config = z.object({
  storage: z.string().default(':memory:')
})

export interface Requires extends Record<string, unknown> {
  argv: Argv
  config: ConfigModule
}

export interface Provides extends Record<string, unknown> {
  datastore: Datastore
  blockstore: Blockstore
  keyManager: KeyManager
}

const module: Module<Provides, Requires> = async ({ argv, config }) => {
  const c = config.get(Config)
  const keyManager = await createKeyManager(Path.resolve(argv.key))

  const datastore = isMemory(c.storage)
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(c.storage, 'datastore'))

  const blockstore = isMemory(c.storage)
    ? new MemoryBlockstore()
    : new FsBlockstore(Path.join(c.storage, 'blockstore'))

  return { keyManager, datastore, blockstore }
}

export default module
