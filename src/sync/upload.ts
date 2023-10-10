import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import all from "it-all";
import * as logger from "../logger.js";
import selectHasher from "../fs-importer/select-hasher.js";
import selectChunker from "../fs-importer/select-chunker.js";
import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";
import type { ImporterConfig } from "../fs-importer/interfaces.js";
import type { Components, ImportOptions } from "../interface.js";

export const addLocal = async (components: Components, params: ImportOptions & { group: CID, onlyHash?: boolean, autoUpdate?: boolean, versionCount?: number }): Promise<CID> => {
	const { blockstore, cipher, localContent } = components;

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

	// Save this.
	await components.dm.pin(cid);
	await all(components.dm.downloadPin(cid));

	await localContent.findOrCreate({
		where: {
			cid: cid.toString(),
			group: params.group.toString(),
		},

		defaults: {
			cid,
			group: params.group,
			cidVersion: params.cidVersion,
			path: params.path,
			state: "UPLOADING",
			rawLeaves: params.rawLeaves,
			chunker: params.chunker,
			hash: params.hash,
			nocopy: params.nocopy,
			encrypt: params.encrypt,
			timestamp: new Date(),
			autoUpdate: params.autoUpdate ?? false,
			versionCount: params.versionCount,
			versions: []
		}
	});

	logger.uploads(`[+] ${params.path}`);

	return cid;
};
