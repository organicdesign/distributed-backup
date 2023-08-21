import type { Welo, Database, Keyvalue } from "../../welo/dist/src/index.js";
import type { Libp2p } from "@libp2p/interface-libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Helia } from "@helia/interface";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";
import type { References, Uploads, Pins } from "./database/index.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { Version, CID } from "multiformats/cid";
import type { DatabaseManager } from "./database/database-manager.js";

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
	libp2p: Libp2p<{ pubsub: PubSub }>
	helia: Helia<Components["libp2p"]>
	welo: Welo
	blockstore: Filestore
	groups: Groups
	cipher: Cipher
	config: Config
	stores: Datastores
	references: typeof References
	uploads: typeof Uploads
	pins: typeof Pins
	dm: DatabaseManager
}

export interface Entry<T extends Uint8Array | CID = CID> {
	cid: T
	author: Uint8Array
	encrypted: boolean
	timestamp: number
	links: Link<T>[]
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

export interface Reference<T extends Uint8Array | CID = CID> {
	group: T
	cid: T
}
/*
export interface Reference<T extends Uint8Array | CID = CID> extends Entry<T> {
	group: T
	status: "blocked" | "added" | "removed"
	local?: ImportOptions & {
		path: string
		updatedAt: number
	}
}
*/
