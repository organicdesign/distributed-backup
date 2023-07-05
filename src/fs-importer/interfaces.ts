import type { ImporterOptions as FullImporterOptions } from "ipfs-unixfs-importer";
import type { CID } from "multiformats/cid";

export interface ImporterOptions extends Pick<FullImporterOptions, "chunker" | "cidVersion"> {
	encrypted: boolean
	nocopy: boolean
}

export interface ImportResult {
	cid: CID,
	size: number
}
