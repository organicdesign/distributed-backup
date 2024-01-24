import { z } from "zod";
import { multiaddr } from "@multiformats/multiaddr";
import { CID } from "multiformats/cid";
import createUploadManager from "./upload-operations.js";
import createSyncManager from "./sync-operations.js";
import type { Welo, Database, Keyvalue } from "welo";
import type { Libp2p as BaseLibp2p } from "libp2p";
import type { PubSub } from "@libp2p/interface/pubsub";
import type { GossipsubEvents } from "@chainsafe/libp2p-gossipsub";
import type { Helia } from "helia";
import type { Blockstore } from "interface-blockstore";
import type { Groups } from "./groups.js";
import type { Cipher } from "./cipher.js";
import type { Datastores } from "./datastores.js";
import type { PinManager } from "./pin-manager.js";
import type { EntryReferences } from "./entry-references.js";
import type { DatabaseMonitor } from "./database-monitor.js";

export type Libp2p = BaseLibp2p<{ pubsub: PubSub<GossipsubEvents> }>

export const MEMORY_MAGIC = ":memory:";
export const VERSION_KEY = "v";
export const DATA_KEY = "r";

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

export const RevisionStrategies = z.enum(["all", "none", "log"]);

export type RevisionStrategies = z.infer<typeof RevisionStrategies>;

export const Config = z.object({
	serverMode: z.boolean(),
	private: z.boolean(),
	tickInterval: z.number(),
	storage: z.string(),
	addresses: z.array(z.string()),
	bootstrap: z.array(z.string()),
	defaultRevisionStrategy: RevisionStrategies
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
	blockstore: Blockstore
	groups: Groups
	cipher: Cipher
	config: Config
	stores: Datastores
	pinManager: PinManager,
	uploads: Awaited<ReturnType<typeof createUploadManager>>,
	sync: Awaited<ReturnType<typeof createSyncManager>>
	references: EntryReferences,
	monitor: DatabaseMonitor
}

export const EncodedEntry = z.object({
	cid: z.instanceof(Uint8Array),
	author: z.instanceof(Uint8Array),
	encrypted: z.boolean(),
	timestamp: z.number(),
	blocks: z.number(),
	size: z.number(),
	sequence: z.number(),
	priority: z.number(),
	revisionStrategy: RevisionStrategies
});

export type EncodedEntry = z.infer<typeof EncodedEntry>

export interface Entry {
	cid: CID
	author: CID
	encrypted: boolean
	timestamp: number
	blocks: number
	size: number
	priority: number
	sequence: number,
	revisionStrategy: RevisionStrategies
}

export const LocalEntryData = z.object({
	priority: z.number().min(0).max(100),
	revisionStrategy: RevisionStrategies
});

export type LocalEntryData = z.infer<typeof LocalEntryData>;

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
