import type { Chunker } from "ipfs-unixfs-importer/chunker";
import type { Hasher } from "multiformats/hashes/hasher";
import type { CID, Version } from "multiformats/cid";

export interface ImporterConfig {
	chunker: Chunker
	hasher: Hasher<string, number>
	cidVersion: Version
}

export interface ImportResult {
	cid: CID
	size: number
}

export interface Cipher {
	encrypt: (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, params: { iv: Uint8Array, salt: Uint8Array }) => AsyncIterable<Uint8Array>
	generate: (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>) => Promise<{ iv: Uint8Array, salt: Uint8Array }>
}
