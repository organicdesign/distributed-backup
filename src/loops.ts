import { groupsToRefs } from "./sync/groups-to-refs.js";
import { linearWeightTranslation } from "./utils.js";
import { pipe } from "it-pipe";
import { collect, tap } from "streaming-iterables";
import parallel from "it-parallel";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { decodeEntry } from "./utils.js";
import { Components, EncodedEntry } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.lifecycle("started");
	// logger.tick("syncing to groups");
	// logger.tick("syncing to references");
	await groupsToRefs(components);
	// logger.tick("syncing to pins");
	// logger.lifecycle("finished");
};

let size = 0n;
let start: number | null = null;

export const downloadLoop = async (components: Components) => {
	//logger.tick("STARTED");
	// logger.tick("GOT REMOTE CONTENTS");

	const SLOTS = 50;

	const batchDownload = async function * (itr: AsyncIterable<[CID, number | undefined]>): AsyncGenerator<() => Promise<{ cid: CID, block: Uint8Array }>, void, undefined> {
		for await (const [cid, p] of itr) {
			const priority = p ?? 100;
			const weight = Math.floor(linearWeightTranslation(priority / 100) * SLOTS) + 1;

			const downloaders = await components.pinManager.downloadSync(cid, { limit: weight });

			yield* downloaders;
		}
	};

	const logSpeed = tap<{ cid: CID, block: Uint8Array }>(({ block }) => {
		try {
			//const block = await components.blockstore.get(cid);

			size += BigInt(block.length);

			const deltaTime = Date.now() - (start ?? 0);
			const kbs = size / BigInt(deltaTime);

			console.log(`download: ${kbs} kb/s`);
		} catch (error) {
			console.error("TAP ERROR", error);
			throw error;
		}
	});

	const loop = async function * () {
		for (;;) {
			await new Promise(resolve => setTimeout(resolve, 100));
			yield;
		}
	}

	const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, number | undefined]> {
		for await (const _ of loop) {
			const pins = [...await components.pinManager.getActiveDownloads()];
			// logger.tick("GOT ACTIVE");

			if (pins.length !== 0 && start == null) {
				start = Date.now();
			}

			for (const cid of pins) {
				const priorities: number[] = [];

				for await (const key of components.stores.get(`reverse-lookup/${cid.toString()}`).queryKeys({})) {
					const parts = key.toString().split("/");
					const group = CID.parse(parts[1]);
					const path = parts.slice(2).join("/");

					const database = components.groups.get(group);

					if (database== null) {
						logger.warn("Reverse lookup points to non-existant database: ", group);
						continue;
					}

					const paily = database.store.index;

					const entry = decodeEntry(EncodedEntry.parse(await database.store.selectors.get(paily)(path)));

					priorities.push(entry.priority);
				}

				yield [cid, Math.min(100, ...priorities)];
			}
		}
	};

	await pipe(
		loop,
		getPins,
		batchDownload,
		i => parallel(i, { concurrency: SLOTS, ordered: false }),
		logSpeed,
		i => collect(i)
	);

	//logger.tick("FINISHED");
};
