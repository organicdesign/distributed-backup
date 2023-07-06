import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { importAny } from "./fs-importer/import-copy-plaintext.js";
import selectHasher from "./fs-importer/select-hasher.js";
import selectChunker from "./fs-importer/select-chunker.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";
import type { CID } from "multiformats/cid";

logger.lifecycle("starting");

const config = await getConfig();
logger.lifecycle("loaded config");

const blockstore = new Filestore(new MemoryBlockstore, new MemoryDatastore());
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore });
logger.lifecycle("started helia");

const { rpc, close } = await createNetServer("/tmp/server.socket");
logger.lifecycle("started server");

interface ImportOptions {
	hash: string
	cidVersion: number
	chunker: string
	rawLeaves: boolean
	nocopy: boolean
	encrypt: boolean
}

const database = new Map<string, { cid: CID, path: string }>();
const timestamps = new Map<string, number>();

rpc.addMethod("add", async (params: { path: string, hashonly?: boolean } & ImportOptions) => {
	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.hashonly) {
		logger.add("importing %s", params.path);
	}

	const { cid } = await importAny(params.path, config, params.hashonly ? undefined : blockstore);

	if (params.hashonly) {
		return cid;
	}

	logger.add("imported %s", params.path);

	if (!await helia.pins.isPinned(cid)) {
		logger.add("pinning %s", params.path);

		await helia.pins.add(cid);
	}

	timestamps.set(params.path, Date.now());
	database.set(params.path, { cid, path: params.path });

	return cid;
});

setInterval(async () => {
	logger.tick("started");

	for (const item of database.values()) {
		const timestamp = timestamps.get(item.path) ?? 0;

		if (Date.now() - timestamp < config.validateInterval * 1000) {
			continue;
		}

		logger.validate("outdated %s", item.path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(),
			hasher: selectHasher(),
			cidVersion: 1
		};

		const { cid: hashOnlyCid } = await importAny(item.path, importerConfig);

		if (hashOnlyCid.equals(item.cid)) {
			timestamps.set(item.path, Date.now());

			logger.validate("cleaned %s", item.path);
			continue;
		}

		logger.validate("updating %s", item.path);

		const { cid } = await importAny(item.path, importerConfig, blockstore);

		if (!await helia.pins.isPinned(cid)) {
			logger.add("pinning %s", item.path);
			await helia.pins.add(cid);
		}

		await helia.pins.rm(item.cid);
		item.cid = cid;

		timestamps.set(item.path, Date.now());

		logger.validate("updated %s", item.path);;
	}

	logger.tick("finished");
}, config.tickInterval * 1000);

rpc.addMethod("query", async () => {
	return [...database.values()];
});

process.on("SIGINT", async () => {
	logger.lifecycle("shutting down");
	await close();
	process.exit();
});

logger.lifecycle("ready");
