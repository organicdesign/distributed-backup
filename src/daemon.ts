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

logger.lifecycle("starting");

const config = await getConfig();
logger.lifecycle("loaded config");

const datastore = new MemoryDatastore();
const stores = new Datastores(datastore);
const blockstore = new Filestore(new MemoryBlockstore(), stores.get("helia/filestore"));
const libp2p = await createLibp2p();
const helia = await createHelia({ libp2p, blockstore, datastore: stores.get("helia/datastore") });
const cipher = await createCipher({ libp2p, datastore: stores.get("cipher"), passphrase: "super-secret" });

logger.lifecycle("started helia");

const welo = await createWelo({ ipfs: helia, replicators: [bootstrapReplicator(), pubsubReplicator()] });

const groups = await createGroups({ datastore: stores.get("groups"), welo });

logger.lifecycle("started welo");

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("started server");

const components: Components = { libp2p, cipher, helia, welo, blockstore, groups, config, stores };

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
