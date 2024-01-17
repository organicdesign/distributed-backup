import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import * as logger from "../logger.js";
import selectHasher from "../fs-importer/select-hasher.js";
import selectChunker from "../fs-importer/select-chunker.js";
import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import { encodeEntry, getDagSize } from "../utils.js";
import { CID } from "multiformats/cid";
import { Components, ImportOptions } from "../interface.js";
import type { ImporterConfig } from "../fs-importer/interfaces.js";

export const addLocal = async (components: Components, params: ImportOptions & { group: CID, onlyHash?: boolean, priority: number, path: string, localPath: string }): Promise<CID> => {
	const { blockstore, cipher } = components;

	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.localPath);
	}

	const store = params.onlyHash ? new BlackHoleBlockstore() : blockstore;
	const load = params.encrypt ? importAnyEncrypted : importAnyPlaintext;

	const { cid } = await load(params.localPath, config, store, cipher);

	if (params.onlyHash) {
		return cid;
	}

	logger.add("imported %s", params.localPath);

	const { size, blocks } = await getDagSize(blockstore, cid);

	// Create the action record.
	const entry = encodeEntry({
		cid,
		sequence: 0,
		blocks,
		size,
		encrypted: params.encrypt,
		timestamp: Date.now(),
		priority: params.priority,
		author: components.libp2p.peerId.toCID()
	});

	await components.uploads.add("put", [params.group.bytes, params.path, entry]);

	return cid;
};
