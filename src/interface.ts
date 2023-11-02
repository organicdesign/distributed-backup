import type { Welo, Database, Keyvalue } from "../../welo/dist/src/index.js";
import type { Libp2p as BaseLibp2p } from "libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import type { Helia } from "helia";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";
import type { RemoteContent, LocalContent } from "./database/index.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { Version, CID } from "multiformats/cid";
import type { PinManager } from "./helia-pin-manager/pin-manager.js";

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export interface Config {
	validateInterval: number
	tickInterval: number
}

export interface Pair<Key = unknown, Value = unknown> {
	key: Key,
	value: Value
}

export interface KeyvalueDB extends Database {
	store: Keyvalue
}

export interface Link<T extends Uint8Array | CID = CID> {
	cid: T,
	type: string
}

export interface Components {
	libp2p: Libp2p
	helia: Helia<Components["libp2p"]>
	welo: Welo
	blockstore: Filestore
	groups: Groups
	cipher: Cipher
	config: Config
	stores: Datastores
	remoteContent: typeof RemoteContent
	localContent: typeof LocalContent
	pinManager: PinManager
}

export interface Entry<T extends Uint8Array | CID = CID> {
	cid: T
	author: Uint8Array
	encrypted: boolean
	timestamp: number
	links: Link<T>[]
	blocks: number
	size: number
	priority: number
	meta?: Record<string, unknown>
}

export interface ImportOptions {
	hash: string
	cidVersion: Version
	chunker: string
	rawLeaves: boolean
	nocopy: boolean
	encrypt: boolean
	path: string
}
