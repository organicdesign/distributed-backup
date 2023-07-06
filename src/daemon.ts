import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { importAny } from "./fs-importer/import-copy-plaintext.js";
import selectHasher from "./fs-importer/select-hasher.js";
import selectChunker from "./fs-importer/select-chunker.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";
import type { CID } from "multiformats/cid";

const blockstore = new Filestore(new MemoryBlockstore, new MemoryDatastore());
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore });

const { rpc, close } = await createNetServer("/tmp/server.socket");

interface ImportOptions {
	hash: string
	cidVersion: number
	chunker: string
	rawLeaves: boolean
	nocopy: boolean
	encrypt: boolean
}

const database: { cid: CID, path: string }[] = [];

rpc.addMethod("add", async (params: { path: string, hashonly?: boolean } & ImportOptions) => {
	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	const { cid } = await importAny(params.path, config, params.hashonly ? undefined : blockstore);

	if (params.hashonly) {
		return cid;
	}

	await helia.pins.add(cid);

	database.push({ cid, path: params.path });

	return cid;
});

setInterval(async () => {
	console.log("running sync");
	for (const item of database) {
		console.log(`checking: ${item.path}`);

		const config: ImporterConfig = {
			chunker: selectChunker(),
			hasher: selectHasher(),
			cidVersion: 1
		};

		const { cid } = await importAny(item.path, config);

		if (cid.equals(item.cid)) {
			console.log("matches");
		} else {
			console.log("needs update");
			const { cid } = await importAny(item.path, config, blockstore);
			await helia.pins.add(cid);
			await helia.pins.rm(item.cid);
			item.cid = cid;
			console.log("updated");
		}
	}
}, 5000);

rpc.addMethod("query", async () => {
	return database;
});

process.on("SIGINT", async () => {
	await close();
	process.exit();
});

console.log("ready");
