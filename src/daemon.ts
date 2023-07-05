import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { importAny } from "./fs-importer/import-copy-plaintext.js";
import type { CID } from "multiformats/cid";

const blockstore = new Filestore(new MemoryBlockstore, new MemoryDatastore());
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore });

const { rpc, close } = await createNetServer("/tmp/server.socket");

const database: { cid: CID, path: string }[] = [];

rpc.addMethod("add", async (params: { path: string, nocopy?: boolean, encrypt?: boolean }) => {
	const { cid } = await importAny(params.path, blockstore);

	await helia.pins.add(cid);

	database.push({ cid, path: params.path });

	return cid;
});

rpc.addMethod("query", async () => {
	return database;
});

process.on("SIGINT", async () => {
	await close();
	process.exit();
});
