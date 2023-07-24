import selectHasher from "../../fs-importer/select-hasher.js";
import selectChunker from "../../fs-importer/select-chunker.js";
import * as logger from "../../logger.js";
import { importAny as importAnyEncrypted } from "../../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../../fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";
import type { Components, ImportOptions } from "../../interface.js";
import type { ImporterConfig } from "../../fs-importer/interfaces.js";

export const name = "add";

export const method = (components: Components) => async (params: { group: string, path: string, onlyHash?: boolean, encrypt?: boolean } & ImportOptions) => {
	const group = components.groups.get(params.group);

	if (group == null) {
		throw new Error("no such group");
	}

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
		const result = await importAnyEncrypted(params.path, config, components.cipher, params.onlyHash ? undefined : components.blockstore);

		cid = result.cid;
	} else {
		// Can we use a blackhole here instead of passing undefined?
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

	const timestamp = Date.now();

	await group.add({
		group: {
			cid: cid.bytes,
			encrypted: params.encrypt,
			addedBy: components.welo.identity.id,
			timestamp
		},

		local: {
			encrypt: params.encrypt,
			path: params.path,
			hash: "sha256",
			chunker: "size-262144",
			rawLeaves: true,
			cidVersion: 1,
			nocopy: false,
			timestamp
		}
	});

	return cid.toString();
};
