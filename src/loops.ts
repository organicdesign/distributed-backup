import { Op } from "sequelize";
import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import { uploadsToGroups } from "./sync/uploads-to-groups.js";
import { refsToPins } from "./sync/refs-to-pins.js";
import { linearWeightTranslation } from "./utils.js";
import { pipe } from "it-pipe";
import { collect, tap } from "streaming-iterables";
import parallel from "it-parallel";
import type { Components } from "./interface.js";
import type { CID } from "multiformats/cid";
import type { RemoteContentModel } from "./database/remoteContent.js";

export const syncLoop = async (components: Components) => {
	// logger.lifecycle("started");
	await diskToUploads(components);
	// logger.tick("syncing to groups");
	await uploadsToGroups(components);
	// logger.tick("syncing to references");
	await groupsToRefs(components);
	// logger.tick("syncing to pins");
	await refsToPins(components);
	// logger.lifecycle("finished");
};

let size = 0n;
let start: number | null = null;

export const downloadLoop = async (components: Components) => {
	//logger.tick("STARTED");
	// logger.tick("GOT REMOTE CONTENTS");

	const SLOTS = 50;

	const batchDownload = async function * (itr: AsyncIterable<[CID, RemoteContentModel | undefined]>): AsyncGenerator<() => Promise<{ cid: CID, block: Uint8Array }>, void, undefined> {
		for await (const [cid, remoteContent] of itr) {
			const priority = remoteContent?.priority ?? 100;
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

	const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, RemoteContentModel | undefined]> {
		for await (const _ of loop) {
			const pins = [...await components.pinManager.getActiveDownloads()];
			// logger.tick("GOT ACTIVE");

			if (pins.length !== 0 && start == null) {
				start = Date.now();
			}

			const remoteContents = await components.remoteContent.findAll({
				where: {
					[Op.or]: pins.map(p => ({ cid: p.toString() }))
				}
			});

			for (const cid of pins) {
				const remoteContent = remoteContents.find(r => cid.equals(r.cid));

				yield [cid, remoteContent];
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
