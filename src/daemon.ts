import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectHasher from "./fs-importer/select-hasher.js";
import selectChunker from "./fs-importer/select-chunker.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { createWelo, Address } from "welo";
import DatabaseHandler from "./database-handler.js";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import type { ImporterConfig } from "./fs-importer/interfaces.js";
import type { CID } from "multiformats/cid";

const argv = await yargs(hideBin(process.argv))
	.option({
		socket: {
			alias: "s",
			type: "string",
			default: "/tmp/server.socket"
		}
	})
	.parse();

logger.lifecycle("starting");

const config = await getConfig();
logger.lifecycle("loaded config");

const blockstore = new Filestore(new MemoryBlockstore, new MemoryDatastore());
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore });

logger.lifecycle("started helia");

const welo = await createWelo({ ipfs: helia });
const handler = new DatabaseHandler(welo);

await handler.create();
logger.lifecycle("started welo: %s", handler.address);

const { rpc, close } = await createNetServer(argv.socket);
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

rpc.addMethod("add", async (params: { path: string, onlyHash?: boolean, encrypt?: boolean } & ImportOptions) => {
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
		const key = new Uint8Array([0, 1, 2, 3]);
		const result = await importAnyEncrypted(params.path, config, key, params.onlyHash ? undefined : blockstore);

		cid = result.cid;
	} else {
		const result = await importAnyPlaintext(params.path, config, params.onlyHash ? undefined : blockstore);

		cid = result.cid;
	}

	if (params.onlyHash) {
		return cid.toString();
	}

	logger.add("imported %s", params.path);

	if (!await helia.pins.isPinned(cid)) {
		logger.add("pinning %s", params.path);

		await helia.pins.add(cid);
	}

	timestamps.set(params.path, Date.now());
	database.set(params.path, { cid, path: params.path });

	await handler.add(cid);

	return cid.toString();
});

rpc.addMethod("query", async () => {
	return [...database.values()];
});

rpc.addMethod("id", async () => {
	return uint8ArrayToString(welo.identity.id, "base58btc");
});

rpc.addMethod("address", async () => {
	return handler.address?.toString();
});

rpc.addMethod("addPeer", async (params: { peer: string }) => {
	await handler.addPeers([uint8ArrayFromString(params.peer, "base58btc")]);
});

rpc.addMethod("connect", async (params: { address: string }) => {
	const address = Address.fromString(params.address);

	await handler.connect(address);
});

process.on("SIGINT", async () => {
	logger.lifecycle("shutting down");
	await close();
	process.exit();
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

		const key = new Uint8Array([0, 1, 2, 3]);
		const { cid: hashOnlyCid } = await importAnyEncrypted(item.path, importerConfig, key);

		if (hashOnlyCid.equals(item.cid)) {
			timestamps.set(item.path, Date.now());

			logger.validate("cleaned %s", item.path);
			continue;
		}

		logger.validate("updating %s", item.path);

		const { cid } = await importAnyEncrypted(item.path, importerConfig, key, blockstore);

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

logger.lifecycle("ready");
