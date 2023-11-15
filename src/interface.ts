import type { Welo, Database, Keyvalue } from "welo";
import type { Libp2p as BaseLibp2p } from "libp2p";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import type { Helia } from "helia";
import type { BIP32Interface } from "bip32";
import type { Sequelize } from "sequelize";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";
import type { LocalContent } from "./database/localContent.js";
import type { RemoteContent } from "./database/remoteContent.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { Version, CID } from "multiformats/cid";
import type { PinManager } from "./helia-pin-manager/pin-manager.js";

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export interface Config {
	private: boolean
	validateInterval: number
	tickInterval: number
	storage: string
	addresses: string[]
	bootstrap: string[]
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
	remoteContent: RemoteContent
	localContent: LocalContent
	sequelize: Sequelize
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

export interface KeyData {
	key: BIP32Interface,
	psk: Uint8Array
}

export interface EncodedKeyData {
	key: string,
	psk: string
}
