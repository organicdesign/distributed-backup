import type { Welo, Database, Keyvalue } from "../../welo/dist/src/index.js";
import type { Libp2p } from "@libp2p/interface-libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Helia } from "@helia/interface";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { Version } from "multiformats/cid";

export interface Config {
	validateInterval: number
	tickInterval: number
}

export interface Pair<Key = unknown, Value = unknown> {
	key: Key,
	value: Value
}

export interface GroupEntry {
	cid: Uint8Array
	addedBy: Uint8Array
	encrypted: boolean
	timestamp: number
	prev?: Uint8Array
	next?: Uint8Array
	meta?: Record<string, unknown>
}

export interface LocalEntry extends ImportOptions {
	timestamp: number
	path?: string
}

export interface CombinedEntry {
	local: LocalEntry,
	group: GroupEntry
}

export interface ImportOptions {
	hash: string
	cidVersion: Version
	chunker: string
	rawLeaves: boolean
	nocopy: boolean
	encrypt: boolean
}

export interface KeyvalueDB extends Database {
	store: Keyvalue
}

export interface Components {
	libp2p: Libp2p<{ pubsub: PubSub }>
	helia: Helia<Components["libp2p"]>
	welo: Welo
	blockstore: Filestore
	groups: Groups
	cipher: Cipher,
	config: Config,
	stores: Datastores
}
