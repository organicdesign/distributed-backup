import { type CID } from 'multiformats/cid'
import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import type { PubSub } from '@libp2p/interface'
import type { Libp2p as BaseLibp2p } from 'libp2p'
import type { Database, Keyvalue } from 'welo'

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export const MEMORY_MAGIC = ':memory:'
export const VERSION_KEY = 'v'
export const DATA_KEY = 'r'

export interface RPCCommand {
  name: string
  method(params: Record<string, unknown>): Promise<unknown> | unknown
}

export interface RPCCommandConstructor<Context extends {} = {}, Components extends {} = {}> { (context: Context, components: Components): RPCCommand }

export interface Module<
  Init extends Record<string, unknown> | void = void,
  Requires extends Record<string, unknown> = Record<string, unknown>,
  Provides extends Record<string, unknown> = Record<string, unknown>,
> {
  (components: Requires, init: Init): Promise<{
    commands: RPCCommand[]
    components: Provides
  }>
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}

export interface KeyvalueDB extends Database {
  store: Keyvalue
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
