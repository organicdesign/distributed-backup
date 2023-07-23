import { Welo, Database, Keyvalue } from "../../welo/dist/src/index.js";
import type { Libp2p } from "@libp2p/interface-libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Helia } from "@helia/interface";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";

export interface Pair<Key = unknown, Value = unknown> {
	key: Key,
	value: Value
}

export interface GroupEntry {
	cid: Uint8Array
	encrypted: boolean
	meta?: Record<string, unknown>
}

export interface LocalEntry extends GroupEntry {
	path?: string
}

export interface ImportOptions {
	hash: string
	cidVersion: number
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
	welo: Welo
	blockstore: Filestore
	helia: Helia<Components["libp2p"]>
	groups: Groups
	encryptionKey: Uint8Array
}
