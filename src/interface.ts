export interface CIDEntry {
	cid: Uint8Array
	path?: Uint8Array
	encrypted: boolean
}

export interface DBEntry {
	address: string
}

export interface ImportOptions {
	hash: string
	cidVersion: number
	chunker: string
	rawLeaves: boolean
	nocopy: boolean
	encrypt: boolean
}
