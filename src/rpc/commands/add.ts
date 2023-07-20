import selectHasher from "../../fs-importer/select-hasher.js";
import selectChunker from "../../fs-importer/select-chunker.js";
import * as logger from "../../logger.js";
import { importAny as importAnyEncrypted } from "../../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../../fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";
import type { Components } from "../utils.js";
import type { ImportOptions } from "../../interface.js";
import type { ImporterConfig } from "../../fs-importer/interfaces.js";

export const name = "add";

export const method = (components: Components) => async (params: { path: string, onlyHash?: boolean, encrypt?: boolean } & ImportOptions) => {
	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.path);
	}

	let cid: CID;

	if (params.encrypt) {
		const result = await importAnyEncrypted(params.path, config, components.encryptionKey, params.onlyHash ? undefined : components.blockstore);

		cid = result.cid;
	} else {
		const result = await importAnyPlaintext(params.path, config, params.onlyHash ? undefined : components.blockstore);

		cid = result.cid;
	}

	if (params.onlyHash) {
		return cid.toString();
	}

	logger.add("imported %s", params.path);

	if (!await components.helia.pins.isPinned(cid)) {
		logger.add("pinning %s", params.path);

		await components.helia.pins.add(cid);
	}


	logger.add("pinned %s", params.path);

	//timestamps.set(params.path, Date.now());

	//await handler.add(cid, params.path, params.encrypt);

	return cid.toString();
};
