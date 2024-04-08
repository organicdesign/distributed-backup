import { zCID } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import type { Downloader } from './downloader/index.js'
import type { EntryTracker } from './entry-tracker.js'
import type { Groups } from './groups.js'
import type { PinManager } from './pin-manager/index.js'
import type { Sneakernet } from './sneakernet/index.js'
import type { Tick } from './tick.js'
import type { KeyvalueDB } from '@/interface.js'
import type { Helia } from '@helia/interface'
import type { UnixFS } from '@helia/unixfs'
import type { Libp2p } from '@libp2p/interface'
import type HeliaPinManager from '@organicdesign/db-helia-pin-manager'
import type { KeyManager } from '@organicdesign/db-key-manager'
import type { NetServer } from '@organicdesign/net-rpc'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'
import type { Welo } from 'welo'

export const MEMORY_MAGIC = ':memory:'

export const Config = z.object({
  storage: z.string().default(MEMORY_MAGIC),
  slots: z.number().int().min(1).max(100).default(20),
  tickInterval: z.number().default(10 * 60),
  serverMode: z.boolean().default(false),
  private: z.boolean().default(false),
  bootstrap: z.array(z.string()).default([]),
  addresses: z.array(z.string()).default([
    '/ip4/127.0.0.1/tcp/0',
    '/ip4/127.0.0.1/tcp/0/ws'
  ]),
  groups: z.array(zCID()).default([])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Components {
  helia: Helia
  libp2p: Libp2p
  welo: Welo
  datastore: Datastore
  blockstore: Blockstore
  stop(): Promise<void>
  net: NetServer
  tick: Tick
  sneakernet: Sneakernet
  getTracker(keyvalueDB: KeyvalueDB): EntryTracker
  parseConfig<T extends z.AnyZodObject>(shape: T): z.infer<T>
  downloader: Downloader
  groups: Groups
  pinManager: PinManager
  heliaPinManager: HeliaPinManager
  events: EventTarget
  keyManager: KeyManager
  unixfs: UnixFS
}
