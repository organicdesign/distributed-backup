import Path from "path";
import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { createWelo, pubsubReplicator, bootstrapReplicator } from "welo";
import createLibp2p from "./libp2p.js";
import { Filestore } from "./filestore/index.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { Looper } from "./looper.js";
import { syncLoop, downloadLoop } from "./loops.js";
import commands from "./rpc/index.js";
import { createGroups } from "./groups.js";
import { Datastores } from "./datastores.js";
import { createCipher } from "./cipher.js";
import { sequelize, RemoteContent, LocalContent } from "./database/index.js";
import setupPinManager from "./helia-pin-manager/index.js";
import { createKeyManager } from "./key-manager/index.js";
import { projectPath } from "./utils.js";
import type { Components } from "./interface.js";

const argv = await yargs(hideBin(process.argv))
	.option({
		socket: {
			alias: "s",
			type: "string",
			default: "/tmp/server.socket"
		}
	})
	.option({
		key: {
			alias: "k",
			type: "string",
			default: Path.join(projectPath, "config/key.json")
		}
	})
	.option({
		private: {
			alias: "p",
			type: "boolean",
			default: false
		}
	})
	.parse();

logger.lifecycle("starting...");

await sequelize.sync();
logger.lifecycle("loaded database");

// Setup datastores and blockstores.
const keyManager = await createKeyManager(Path.resolve(argv.key));
const datastore = new MemoryDatastore();
const stores = new Datastores(datastore);
const blockstore = new Filestore(new MemoryBlockstore(), stores.get("helia/filestore"));

// const references = await createReferences(stores.get("references"));

// Setup all the modules.
const config = await getConfig();
logger.lifecycle("loaded config");

const peerId = await keyManager.getPeerId();
const psk = keyManager.getPskKey();
const libp2p = await createLibp2p({ peerId, psk: argv.private ? psk : undefined });
logger.lifecycle("loaded libp2p");

const helia = await createHelia({ libp2p, blockstore, datastore: stores.get("helia/datastore") });
logger.lifecycle("loaded helia");

const welo = await createWelo({
	// @ts-ignore Helia version mismatch here.
	ipfs: helia,
	replicators: [bootstrapReplicator(), pubsubReplicator()],
	identity: await keyManager.getWeloIdentity()
});
logger.lifecycle("loaded welo");

const cipher = await createCipher({ keyManager });
logger.lifecycle("loaded cipher");

const groups = await createGroups({ datastore: stores.get("groups"), welo });
logger.lifecycle("loaded groups");

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("loaded server");

const pinManager = await setupPinManager(helia);

pinManager.events.addEventListener("downloads:added", ({ cid }) => logger.downloads(`[+] ${cid}`));
pinManager.events.addEventListener("pins:added", ({ cid }) => logger.pins(`[+] ${cid}`));
pinManager.events.addEventListener("pins:adding", ({ cid }) => logger.pins(`[~] ${cid}`));
pinManager.events.addEventListener("pins:removed", ({ cid }) => logger.pins(`[-] ${cid}`));

const components: Components = {
// @ts-ignore
	libp2p,
	cipher,
// @ts-ignores
	helia,
	welo,
	blockstore,
	groups,
	config,
	stores,
	pinManager,
	remoteContent: RemoteContent,
	localContent: LocalContent
};

// Register all the RPC commands.
for (const command of commands) {
	rpc.addMethod(command.name, command.method(components))
}

// Cleanup on signal interupt.
let exiting = false;

process.on("SIGINT", async () => {
	if (exiting) {
		logger.lifecycle("force exiting");
		process.exit(1);
	}

	exiting = true;

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
	// Sequelize will close automatically.
	// await sequelize.close();
	// logger.lifecycle("stopped database");
	process.exit();
});
//
// Create the loops.
const loops = [
	new Looper(() => syncLoop(components), { sleep: config.tickInterval * 1000 }),
	new Looper(() => downloadLoop(components), { sleep: config.tickInterval * 1000 })
];

logger.lifecycle("started");

// Run the main loop.
await Promise.all(loops.map(l => l.run()))
