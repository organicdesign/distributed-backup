import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import * as logger from "../logger.js";
import selectHasher from "../fs-importer/select-hasher.js";
import selectChunker from "../fs-importer/select-chunker.js";
import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";
import type { ImporterConfig } from "../fs-importer/interfaces.js";
import type { Components, ImportOptions } from "../interface.js";

export const addLocal = async (components: Components, params: ImportOptions & { onlyHash?: boolean, autoUpdate?: boolean }): Promise<CID> => {
	const { blockstore, cipher, uploads } = components;

	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.path);
	}

	const store = params.onlyHash ? new BlackHoleBlockstore() : blockstore;
	const load = params.encrypt ? importAnyEncrypted : importAnyPlaintext;

	const { cid } = await load(params.path, config, store, cipher);

	if (params.onlyHash) {
		return cid;
	}

	logger.add("imported %s", params.path);

	await uploads.findOrCreate({
		where: {
			cid: cid.toString()
		},

		defaults: {
			cid,
			cidVersion: params.cidVersion,
			path: params.path,
			state: "COMPLETED",
			rawLeaves: params.rawLeaves,
			chunker: params.chunker,
			hash: params.hash,
			nocopy: params.nocopy,
			encrypt: params.encrypt,
			timestamp: new Date(),
			autoUpdate: params.autoUpdate ?? false
		}
	});

	logger.uploads(`[+] ${params.path}`);

	return cid;
};
