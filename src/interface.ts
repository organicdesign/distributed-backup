import { z } from "zod";
import { multiaddr } from "@multiformats/multiaddr";
import { CID } from "multiformats/cid";
import type { Welo, Database, Keyvalue } from "welo";
import type { Libp2p as BaseLibp2p } from "libp2p";
import type { PubSub } from "@libp2p/interface/pubsub";
import type { GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import type { Helia } from "helia";
import type { BIP32Interface } from "bip32";
import type { Sequelize } from "sequelize";
import type { Filestore } from "./filestore/index.js";
import type { Groups } from "./groups.js";
import type { Content } from "./database/content.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { PinManager } from "./helia-pin-manager/pin-manager.js";

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export const zMultiaddr = z.custom<string>(val => {
	if (typeof val !== "string") {
		return false;
	}

	try {
		multiaddr(val);
	} catch (error) {
		return false;
	}

	return true;
});

export const zCID = z.custom<string>(val => {
	if (typeof val !== "string") {
		return false;
	}

	try {
		CID.parse(val);
	} catch (error) {
		return false;
	}

	return true;
});

export const Config = z.object({
	serverMode: z.boolean(),
	private: z.boolean(),
	validateInterval: z.number(),
	tickInterval: z.number(),
	storage: z.string(),
	addresses: z.array(z.string()),
	bootstrap: z.array(z.string())
});

export type Config = z.infer<typeof Config>

export interface Pair<Key = unknown, Value = unknown> {
	key: Key,
	value: Value
}

export interface KeyvalueDB extends Database {
	store: Keyvalue
}

export interface Link {
	cid: CID,
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
	content: Content
	sequelize: Sequelize
	pinManager: PinManager
}

export const EncodedEntry = z.object({
	cid: z.instanceof(Uint8Array),
	author: z.instanceof(Uint8Array),
	encrypted: z.boolean(),
	timestamp: z.number(),
	links: z.array(z.object({
		cid: z.instanceof(Uint8Array),
		type: z.string()
	})),
	blocks: z.number(),
	size: z.number(),
	priority: z.number()
});

export type EncodedEntry = z.infer<typeof EncodedEntry>

export interface Entry {
	cid: CID
	author: Uint8Array
	encrypted: boolean
	timestamp: number
	links: Link[]
	blocks: number
	size: number
	priority: number
	meta?: Record<string, unknown>
}

export const ImportOptions = z.object({
	hash: z.string(),
	cidVersion: z.union([z.literal(0), z.literal(1)]),
	chunker: z.string(),
	rawLeaves: z.boolean(),
	nocopy: z.boolean(),
	encrypt: z.boolean(),
	path: z.string()
});

export type ImportOptions = z.infer<typeof ImportOptions>

export interface KeyData {
	key: BIP32Interface,
	psk: Uint8Array
}

export const EncodedKeyData = z.object({
	key: z.string(),
	psk: z.string()
});

export type EncodedKeyData = z.infer<typeof EncodedKeyData>
