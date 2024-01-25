import { z } from "zod";
import { CID } from "multiformats/cid";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { selectHasher, selectChunker, fsImport, type ImporterConfig } from "../../../fs-import-export/index.js";
import { encodeEntry, getDagSize } from "../../utils.js";
import * as logger from "../../logger.js";
import { type Components, zCID, ImportOptions, RevisionStrategies } from "../../interface.js";

export const name = "add";

const Params = ImportOptions.partial().extend(z.object({
	path: z.string(),
	group: zCID,
	localPath: z.string(),
	onlyHash: z.boolean().optional(),
	autoUpdate: z.boolean().optional(),
	versionCount: z.number().optional(),
	priority: z.number().optional(),
	revisionStrategy: RevisionStrategies.optional()
}).shape);

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const encrypt = !!params.encrypt;

	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.localPath);
	}

	const store = params.onlyHash ? new BlackHoleBlockstore() : components.blockstore;
	const cipher = encrypt ? components.cipher : undefined;
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
		encrypted: encrypt,
		timestamp: Date.now(),
		priority: params.priority ?? 1,
		author: components.libp2p.peerId.toCID(),
		revisionStrategy: params.revisionStrategy ?? components.config.defaultRevisionStrategy
	});

	await components.uploads.add("put", [CID.parse(params.group).bytes, params.path, entry]);

	return cid.toString();
};
