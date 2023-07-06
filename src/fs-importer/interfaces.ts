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
