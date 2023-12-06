import Path from "path";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import * as logger from "../logger.js";
import selectHasher from "../fs-importer/select-hasher.js";
import selectChunker from "../fs-importer/select-chunker.js";
import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";
import type { ImporterConfig } from "../fs-importer/interfaces.js";
import type { Components, ImportOptions } from "../interface.js";

export const addLocal = async (components: Components, params: ImportOptions & { group: CID, onlyHash?: boolean, priority: number, path: string, localPath: string }): Promise<CID> => {
	const { blockstore, cipher, content } = components;

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

	// Save this.
	await components.pinManager.pinLocal(cid);

	const root = await content.findOne({ where: {
		group: params.group.toString(),
		path: Path.join(params.path, "ROOT")
	} });

	const sequence = root?.sequence != null ? root.sequence + 1 : 0;

	await content.findOrCreate({
		where: {
			path: Path.join(params.path, components.libp2p.peerId.toString(), sequence.toString()),
			group: params.group.toString()
		},

		defaults: {
			cid,
			group: params.group,
			path: Path.join(params.path, components.libp2p.peerId.toString(), sequence.toString()), // SWITCH THIS OUT FOR REVISION COUNTER...
			state: "UPLOADING",
			sequence,
			encrypted: params.encrypt,
			timestamp: new Date(),
			links: [],
			priority: params.priority
		}
	});

	if (root != null && (root.sequence ?? 0) < sequence) {
		root.sequence = sequence;

		await root.save();
	}

	logger.uploads(`[+] ${params.path}`);

	return cid;
};
