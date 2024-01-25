import syncGroups from "./sync-groups.js";
import { linearWeightTranslation } from "./utils.js";
import { pipe } from "it-pipe";
import { collect, tap } from "streaming-iterables";
import parallel from "it-parallel";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { decodeEntry } from "./utils.js";
import { Components, EncodedEntry } from "./interface.js";

export const syncLoop = async (components: Components) => {
	await syncGroups(components);
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

			const downloaders = await components.pinManager.download(cid, { limit: weight });

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

	const catcher = async function* <T = unknown>(itr: AsyncIterable<T>): AsyncIterable<T> {
		try {
			yield* itr;
		} catch (error) {
			logger.warn("downloader threw: ", error)
			yield* catcher(itr);
		}
	};

	const loop = async function * () {
		for (;;) {
			await new Promise(resolve => setTimeout(resolve, 100));
			yield;
		}
	}

	const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, number | undefined]> {
		for await (const _ of loop) {
			for await (const { group, path } of components.pinManager.getActive()) {
				const database = components.groups.get(group);

				if (database == null) {
					logger.warn("Reverse lookup points to non-existant database: ", group);
					continue;
				}

				const paily = database.store.index;
				const data = await database.store.selectors.get(paily)(path);
				const entry = decodeEntry(EncodedEntry.parse(data));

				let priority: number = entry.priority;

				if (path.startsWith("/r")) {
					const localRef = await components.localSettings.get(group, path.slice(2));

					if (localRef?.priority != null) {
						priority = localRef.priority;
					}
				}

				yield [entry.cid, priority];
			}
		}
	};

	await pipe(
		loop,
		getPins,
		batchDownload,
		i => parallel(i, { concurrency: SLOTS, ordered: false }),
		i => catcher(i),
		logSpeed,
		i => collect(i)
	);

	//logger.tick("FINISHED");
};
