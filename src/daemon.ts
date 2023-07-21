import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import createLibp2p from "./libp2p.js";
import { CMS } from "@libp2p/cms";
import { Filestore } from "./filestore/index.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { createWelo, pubsubReplicator, bootstrapReplicator } from "../../welo/dist/src/index.js";
import DatabaseHandler from "./database-handler.js";
import crypto from "crypto";
import { Looper } from "./looper.js";
import mainLoop from "./main-loop.js";
import commands from "./rpc/index.js";
import { Key } from "interface-datastore";
import { Groups } from "./groups.js";
import { NamespaceDatastore } from "./datastore.js";

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

const rootDatastore = new MemoryDatastore();
const heliaDatastore = new NamespaceDatastore(rootDatastore, new Key("helia/datastore"));
const heliaFilestore = new NamespaceDatastore(rootDatastore, new Key("helia/filestore"));
const groupsDatastore = new NamespaceDatastore(rootDatastore, new Key("groups"));
const blockstore = new Filestore(new MemoryBlockstore(), heliaFilestore);
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore, datastore: heliaDatastore });

logger.lifecycle("started helia");

const key = await libp2p.keychain.createKey("database", "RSA");
const cms = new CMS(libp2p.keychain)

const encryptionKey = crypto.randomBytes(32);
const encrypted = await cms.encrypt(key.name, encryptionKey);

console.warn("need to save and load aesKey");
logger.lifecycle("generated key");

const welo = await createWelo({ ipfs: helia, replicators: [bootstrapReplicator(), pubsubReplicator()] });
const handler = new DatabaseHandler(welo, cms);

const groups = new Groups({ datastore: groupsDatastore, welo });

await groups.start();

//const groups: GroupDatabase[] = [];
await handler.create();
logger.lifecycle("started welo: %s", handler.address);

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("started server");

// Register all the RPC commands.
for (const command of commands) {
	rpc.addMethod(command.name, command.method({ libp2p, encryptionKey, helia, welo, blockstore, groups }))
}

process.on("SIGINT", async () => {
	logger.lifecycle("shutting down");
	await close();
	process.exit();
});

const looper = new Looper(mainLoop, { sleep: config.tickInterval * 1000 });

logger.lifecycle("ready");

await looper.run();
