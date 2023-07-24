import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { createWelo, pubsubReplicator, bootstrapReplicator } from "../../welo/dist/src/index.js";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { Looper } from "./looper.js";
import mainLoop from "./main-loop.js";
import commands from "./rpc/index.js";
import { createGroups } from "./groups.js";
import { Datastores } from "./datastores.js";
import { createCipher } from "./cipher.js";
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

logger.lifecycle("starting...");

// Setup datastores and blockstores.
const datastore = new MemoryDatastore();
const stores = new Datastores(datastore);
const blockstore = new Filestore(new MemoryBlockstore(), stores.get("helia/filestore"));

// Setup all the modules.
const config = await getConfig();
logger.lifecycle("loaded config");

const libp2p = await createLibp2p();
logger.lifecycle("loaded libp2p");

const helia = await createHelia({ libp2p, blockstore, datastore: stores.get("helia/datastore") });
logger.lifecycle("loaded helia");

const welo = await createWelo({
	ipfs: helia,
	replicators: [bootstrapReplicator(), pubsubReplicator()]
});
logger.lifecycle("loaded welo");

const cipher = await createCipher({
	libp2p,
	datastore: stores.get("cipher"),
	passphrase: "super-secret"
});
logger.lifecycle("loaded cipher");

const groups = await createGroups({ datastore: stores.get("groups"), welo });
logger.lifecycle("loaded groups");

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("loaded server");

const components: Components = { libp2p, cipher, helia, welo, blockstore, groups, config, stores };

// Register all the RPC commands.
for (const command of commands) {
	rpc.addMethod(command.name, command.method(components))
}

// Cleanup on signal interupt.
process.on("SIGINT", async () => {
	logger.lifecycle("cleaning up...");
	await close();
	logger.lifecycle("stopped server");
	await groups.stop();
	logger.lifecycle("stopped groups");
	await cipher.stop();
	logger.lifecycle("stopped cipher");
	await welo.stop();
	logger.lifecycle("stopped welo");
	await helia.stop();
	logger.lifecycle("stopped helia");
	await libp2p.stop();
	logger.lifecycle("stopped libp2p");
	process.exit();
});

// Create the looper.
const looper = new Looper(() => mainLoop(components), { sleep: config.tickInterval * 1000 });

logger.lifecycle("started");

// Run the main loop.
await looper.run();
