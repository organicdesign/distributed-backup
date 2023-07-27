import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { CID } from "multiformats/cid";
import selectHasher from "../../fs-importer/select-hasher.js";
import selectChunker from "../../fs-importer/select-chunker.js";
import * as logger from "../../logger.js";
import { importAny as importAnyEncrypted } from "../../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../../fs-importer/import-copy-plaintext.js";
import type { Components, ImportOptions } from "../../interface.js";
import type { ImporterConfig } from "../../fs-importer/interfaces.js";

export const name = "add";

export const method = ({ references, groups, blockstore, cipher, helia, welo }: Components) => async (params: { group: string, path: string, onlyHash?: boolean, encrypt?: boolean } & ImportOptions) => {
	const group = CID.parse(params.group);

	if (groups.get(group) == null) {
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

	const store = params.onlyHash ? new BlackHoleBlockstore() : blockstore;
	const load = params.encrypt ? importAnyEncrypted : importAnyPlaintext;

	const { cid } = await load(params.path, config, store, cipher);

	if (params.onlyHash) {
		return cid.toString();
	}

	logger.add("imported %s", params.path);

	if (!await helia.pins.isPinned(cid)) {
		logger.add("pinning %s", params.path);

		await helia.pins.add(cid);
	}

	logger.add("pinned %s", params.path);

	const timestamp = Date.now();

	await references.set({
		cid,
		timestamp,
		group,
		encrypted: params.encrypt,
		addedBy: welo.identity.id,
		status: "added",

		local: {
			encrypt: params.encrypt,
			path: params.path,
			hash: "sha2-256",
			chunker: "size-262144",
			rawLeaves: true,
			cidVersion: 1,
			nocopy: false,
			updatedAt: timestamp
		}
	});

	return cid.toString();
};
