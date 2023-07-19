import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import createLibp2p from "./libp2p.js";
import { CMS } from "@libp2p/cms";
import { Filestore } from "./filestore/index.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectHasher from "./fs-importer/select-hasher.js";
import selectChunker from "./fs-importer/select-chunker.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { createWelo, pubsubReplicator, bootstrapReplicator, Address } from "../../welo/dist/src/index.js";
import DatabaseHandler from "./database-handler.js";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { multiaddr } from "@multiformats/multiaddr";
import crypto from "crypto"
import { CID } from "multiformats/cid";
import { GroupDatabase } from "./database/group-database.js";
import { joinGroup } from "./database/utils.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

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

const blockstore = new Filestore(new MemoryBlockstore(), new MemoryDatastore());
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore });

logger.lifecycle("started helia");

const key = await libp2p.keychain.createKey("database", "RSA");
const cms = new CMS(libp2p.keychain)

const aesKey = crypto.randomBytes(32);
const encrypted = await cms.encrypt(key.name, aesKey);

console.warn("need to save and load aesKey");
logger.lifecycle("generated key");

const welo = await createWelo({ ipfs: helia, replicators: [bootstrapReplicator(), pubsubReplicator()] });
const handler = new DatabaseHandler(welo, cms);


const groups: GroupDatabase[] = [];
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
		const result = await importAnyEncrypted(params.path, config, aesKey, params.onlyHash ? undefined : blockstore);

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


	logger.add("pinned %s", params.path);

	timestamps.set(params.path, Date.now());

	await handler.add(cid, params.path, params.encrypt);

	return cid.toString();
});

rpc.addMethod("query", async () => {
	const map = await handler.query();
	const values = [...map.values()] as { path: Uint8Array, cid: Uint8Array }[];

	return values.map(v => ({
		path: uint8ArrayToString(v.path, "base64"),
		cid: CID.decode(v.cid).toString()
	}));
});

rpc.addMethod("connections", async () => {
	return libp2p.getConnections().map(c => c.remotePeer);
});

rpc.addMethod("pubsub", async () => {
	return libp2p.services.pubsub.getTopics();
});

rpc.addMethod("id", async () => {
	return uint8ArrayToString(welo.identity.id, "base58btc");
});

rpc.addMethod("addresses", async (params: { type: "libp2p" | "welo" }) => {
	if (params.type === "welo") {
		return handler.address?.toString();
	}

	if (params.type === "libp2p") {
		return libp2p.getMultiaddrs().map(a => a.toString());
	}

	throw new Error("invalid type");
});

rpc.addMethod("addPeer", async (params: { peer: string }) => {
	await handler.addPeers([uint8ArrayFromString(params.peer, "base64")]);
});

rpc.addMethod("connect", async (params: { address: string }) => {
	const address = multiaddr(params.address);

	await libp2p.dial(address);
});

rpc.addMethod("join", async (params: { address: string }) => {
	const database = await joinGroup(welo, params.address);
	const group = new GroupDatabase(database);

	groups.push(group);
});

process.on("SIGINT", async () => {
	logger.lifecycle("shutting down");
	await close();
	process.exit();
});

setInterval(async () => {
	logger.tick("started");

	for (const item of (await handler.query()).values() as Iterable<{ path: Uint8Array, cid: Uint8Array, encrypted: boolean }>) {
		const path = uint8ArrayToString(await cms.decrypt(item.path));
		const cid = CID.decode(item.cid);
		const timestamp = timestamps.get(path) ?? 0;

		if (Date.now() - timestamp < config.validateInterval * 1000) {
			continue;
		}

		logger.validate("outdated %s", path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(),
			hasher: selectHasher(),
			cidVersion: 1
		};

		const { cid: newCid } = item.encrypted ?
			await importAnyEncrypted(path, importerConfig, aesKey) :
			await importAnyPlaintext(path, importerConfig);

		if (newCid.equals(cid)) {
			timestamps.set(path, Date.now());

			logger.validate("cleaned %s", path);
			continue;
		}

		logger.validate("updating %s", path);

		if (item.encrypted) {
			await importAnyEncrypted(path, importerConfig, aesKey, blockstore);
		} else {
			await importAnyPlaintext(path, importerConfig, blockstore);
		}

		if (!await helia.pins.isPinned(newCid)) {
			logger.add("pinning %s", path);
			await helia.pins.add(newCid);
		}

		await helia.pins.rm(cid);

		await handler.replace(cid, newCid);

		timestamps.set(path, Date.now());

		logger.validate("updated %s", path);
	}

	logger.tick("finished");
}, config.tickInterval * 1000);

logger.lifecycle("ready");
