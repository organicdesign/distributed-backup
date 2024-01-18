import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { CID } from "multiformats/cid";
import * as logger from "../logger.js";
import { encodeEntry, getDagSize } from "../utils.js";
import { Components, ImportOptions } from "../interface.js";
import { selectHasher, selectChunker, fsImport, type ImporterConfig } from "../fs-import-export/index.js";

export const addLocal = async (components: Components, params: ImportOptions & { group: CID, onlyHash?: boolean, priority: number, path: string, localPath: string }): Promise<CID> => {
	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.localPath);
	}

	const store = params.onlyHash ? new BlackHoleBlockstore() : components.blockstore;
	const cipher = params.encrypt ? components.cipher : undefined;
	const { cid } = await fsImport(store, params.localPath, config, cipher);

	if (params.onlyHash) {
		return cid;
	}

	logger.add("imported %s", params.localPath);

	const { size, blocks } = await getDagSize(components.blockstore, cid);

	// Create the action record.
	const entry = encodeEntry({
		cid,
		sequence: 0,
		blocks,
		size,
		encrypted: params.encrypt,
		timestamp: Date.now(),
		priority: params.priority,
		author: components.libp2p.peerId.toCID(),
		revisionStrategy: components.config.defaultRevisionStrategy
	});

	await components.uploads.add("put", [params.group.bytes, params.path, entry]);

	return cid;
};
