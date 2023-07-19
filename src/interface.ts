import { Database, Keyvalue } from "../../welo/dist/src/index.js";

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
