import importPlaintext from "./import-plaintext.js";
import importEncrypted from "./import-encrypted.js";
import exportPlaintext from "./export-plaintext.js";
import selectHasherFunc from "./select-hasher.js";
import selectChunkerFunc from "./select-chunker.js";
import type { Blockstore } from "interface-blockstore";
import type { CID } from "multiformats/cid";
import type { ImporterConfig, Cipher, ImportResult } from "./interfaces.js";

export type * from "./interfaces.js";

export const selectHasher = selectHasherFunc;
export const selectChunker = selectChunkerFunc;

export const fsImport = async (blockstore: Blockstore, path: string, config: ImporterConfig, cipher?: Cipher): Promise<ImportResult> => {
	if (cipher == null) {
		return await importPlaintext(blockstore, path, config);
	} else {
		return await importEncrypted(blockstore, path, config, cipher);
	}
};

export const fsExport = async (blockstore: Blockstore, path: string, cid: CID) => {
	return await exportPlaintext(blockstore, path, cid);
};
