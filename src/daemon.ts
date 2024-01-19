import Path from "path";
import fs from "fs/promises";
import { createNetServer } from "@organicdesign/net-rpc";
import { createHelia } from "helia";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { createWelo, pubsubReplicator, bootstrapReplicator } from "welo";
import createLibp2p from "./libp2p.js";
import { getConfig } from "./config.js";
import * as logger from "./logger.js";
import { Looper } from "./looper.js";
import { syncLoop, downloadLoop } from "./loops.js";
import commands from "./rpc/index.js";
import { createGroups } from "./groups.js";
import { Datastores } from "./datastores.js";
import { createCipher } from "./cipher.js";
import { PinManager } from "./pin-manager/index.js";
import createHeliaPinManager from "./helia-pin-manager/index.js";
import { createKeyManager } from "./key-manager/index.js";
import { projectPath, isMemory } from "./utils.js";
import createUploadManager from "./sync/upload-operations.js";
import createSyncManager from "./sync/sync-operations.js";
import { DatabaseMonitor } from "./database-monitor.js";
import { EntryReferences } from "./entry-references.js";
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
		config: {
			alias: "c",
			type: "string",
			default: Path.join(projectPath, "config/config.json")
		}
	})
	.parse();

logger.lifecycle("starting...");

// Setup all the modules.
const config = await getConfig(argv.config);
logger.lifecycle("loaded config");

if (!isMemory(config.storage)) {
	await fs.mkdir(Path.join(config.storage, "datastore/libp2p"), { recursive: true });
}

// Setup datastores and blockstores.
const keyManager = await createKeyManager(Path.resolve(argv.key));
const datastore = isMemory(config.storage) ? new MemoryDatastore() : new FsDatastore(Path.join(config.storage, "datastore"));
const stores = new Datastores(datastore);
const blockstore = isMemory(config.storage) ? new MemoryBlockstore() : new FsBlockstore(Path.join(config.storage, "blockstore"));

// const references = await createReferences(stores.get("references"));
const peerId = await keyManager.getPeerId();
const psk = keyManager.getPskKey();

const libp2pDatastore = isMemory(config.storage) ? new MemoryDatastore() : new FsDatastore(Path.join(config.storage, "datastore/libp2p"));

const libp2p = await createLibp2p({ datastore: libp2pDatastore, peerId, psk: config.private ? psk : undefined, ...config });
logger.lifecycle("loaded libp2p");

// @ts-ignore
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

const references = new EntryReferences({ datastore: stores.get("references") });

const groups = await createGroups({ datastore: stores.get("groups"), welo });
logger.lifecycle("loaded groups");

const { rpc, close } = await createNetServer(argv.socket);
logger.lifecycle("loaded server");



const heliaPinManager = await createHeliaPinManager(helia, { storage: isMemory(config.storage) ? ":memory:" : Path.join(config.storage, "sqlite") });

heliaPinManager.events.addEventListener("downloads:added", ({ cid }) => logger.downloads(`[+] ${cid}`));
heliaPinManager.events.addEventListener("pins:added", ({ cid }) => logger.pins(`[+] ${cid}`));
heliaPinManager.events.addEventListener("pins:adding", ({ cid }) => logger.pins(`[~] ${cid}`));
heliaPinManager.events.addEventListener("pins:removed", ({ cid }) => logger.pins(`[-] ${cid}`));

const pinManager = new PinManager({ pinManager: heliaPinManager, datastore: stores.get("pin-references") });

const monitor = new DatabaseMonitor({ datastore: stores.get("database-monitor") });

const sync = await createSyncManager({ stores, pinManager, groups, monitor });

logger.lifecycle("downloads synced");

const uploads = await createUploadManager({ libp2p, stores, groups, pinManager, blockstore });

logger.lifecycle("uploads synced");

const components: Components = {
	libp2p,
	cipher,
	helia,
	welo,
	blockstore,
	groups,
	config,
	stores,
	pinManager,
	uploads,
	sync,
	references,
	monitor
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

	logger.lifecycle("exiting...");

	process.exit();
});

// Create the loops.
const loops = [
	new Looper(() => syncLoop(components), { sleep: config.tickInterval * 1000 }),
	new Looper(() => downloadLoop(components), { sleep: config.tickInterval * 1000 })
];

logger.lifecycle("started");

// Run the main loop.
await Promise.all(loops.map(l => l.run()));
