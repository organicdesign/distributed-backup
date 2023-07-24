import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { createWelo, pubsubReplicator, bootstrapReplicator } from "../../welo/dist/src/index.js";
import { Looper } from "./looper.js";
import mainLoop from "./main-loop.js";
import commands from "./rpc/index.js";
import { Key } from "interface-datastore";
import { Groups } from "./groups.js";
import { NamespaceDatastore } from "./datastore.js";
import { Cipher } from "./cipher.js";
import type { Components } from "./interface.js";

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
const cipherDatastore = new NamespaceDatastore(rootDatastore, new Key("cipher"));
const blockstore = new Filestore(new MemoryBlockstore(), heliaFilestore);
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore, datastore: heliaDatastore });
const cipher = new Cipher({ libp2p, datastore: cipherDatastore, passphrase: "super-secret" });

await cipher.start();

logger.lifecycle("started helia");

const welo = await createWelo({ ipfs: helia, replicators: [bootstrapReplicator(), pubsubReplicator()] });

const groups = new Groups({ datastore: groupsDatastore, welo });

await groups.start();

logger.lifecycle("started welo");

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("started server");

const components: Components = { libp2p, cipher, helia, welo, blockstore, groups, config };

// Register all the RPC commands.
for (const command of commands) {
	rpc.addMethod(command.name, command.method(components))
}

process.on("SIGINT", async () => {
	logger.lifecycle("shutting down");
	await close();
	process.exit();
});

const looper = new Looper(() => mainLoop(components), { sleep: config.tickInterval * 1000 });

logger.lifecycle("ready");

await looper.run();
