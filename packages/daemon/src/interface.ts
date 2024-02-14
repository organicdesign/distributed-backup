import { type CID } from 'multiformats/cid'
import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import type { Groups } from './groups.js'
import type { LocalSettings } from './local-settings.js'
import type { Config } from './modules.js'
import type { PinManager } from './pin-manager.js'
import type createSyncManager from './sync-operations.js'
import type createUploadManager from './upload-operations.js'
import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import type { PubSub } from '@libp2p/interface'
import type { Cipher } from 'cipher'
import type { Helia } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { Libp2p as BaseLibp2p } from 'libp2p'
import type { Welo, Database, Keyvalue } from 'welo'

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export const MEMORY_MAGIC = ':memory:'
export const VERSION_KEY = 'v'
export const DATA_KEY = 'r'

export interface RPCCommand<Components extends {} = {}> {
	name: string
	method(components: Components): (params: Record<string, unknown>) => Promise<unknown> | unknown
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}

export interface KeyvalueDB extends Database {
  store: Keyvalue
}

export interface Components {
  libp2p: Libp2p
  helia: Helia
  welo: Welo
  blockstore: Blockstore
  groups: Groups
  cipher: Cipher
  config: Config
  pinManager: PinManager
  uploads: Awaited<ReturnType<typeof createUploadManager>>
  sync: Awaited<ReturnType<typeof createSyncManager>>
  localSettings: LocalSettings
}

export const EncodedEntry = z.union([
  z.object({
    cid: z.instanceof(Uint8Array),
    author: z.instanceof(Uint8Array),
    encrypted: z.boolean(),
    timestamp: z.number(),
    blocks: z.number(),
    size: z.number(),
    sequence: z.number(),
    priority: z.number(),
    revisionStrategy: RevisionStrategies
  }),
  z.null()
])

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedEntry = z.infer<typeof EncodedEntry>

export type Entry = {
  [P in keyof NonNullable<EncodedEntry>]: NonNullable<EncodedEntry>[P] extends Uint8Array ? CID : NonNullable<EncodedEntry>[P]
}

export const LocalEntryData = z.object({
  priority: z.number().min(0).max(100),
  revisionStrategy: RevisionStrategies
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LocalEntryData = z.infer<typeof LocalEntryData>

export const ImportOptions = z.object({
  hash: z.string(),
  cidVersion: z.union([z.literal(0), z.literal(1)]),
  chunker: z.string(),
  rawLeaves: z.boolean(),
  encrypt: z.boolean(),
  path: z.string()
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ImportOptions = z.infer<typeof ImportOptions>

export const EncodedPinInfo = z.object({
  hash: z.instanceof(Uint8Array),
  cid: z.instanceof(Uint8Array)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type EncodedPinInfo = z.infer<typeof EncodedPinInfo>

export interface PinInfo {
  hash: Uint8Array
  cid: CID
}
