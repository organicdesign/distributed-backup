import { Op } from "sequelize";
import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import { uploadsToGroups } from "./sync/uploads-to-groups.js";
import { refsToPins } from "./sync/refs-to-pins.js";
import { linearWeightTranslation } from "./utils.js";
import * as logger from "./logger.js";
import { pipe } from "it-pipe";
import { take, collect, tap, parallelMerge } from "streaming-iterables";
import parallel from "it-parallel";
import type { Components } from "./interface.js";
import type { CID } from "multiformats/cid";

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
	const pins = await components.pinManager.getActiveDownloads();
	// logger.tick("GOT ACTIVE");

	if (pins.length !== 0 && start == null) {
		start = Date.now();
	}

	const remoteContents = await components.remoteContent.findAll({
		where: {
			[Op.or]: pins.map(p => ({ cid: p.toString() }))
		}
	});
	// logger.tick("GOT REMOTE CONTENTS");

	const SLOTS = 10;

	const batchDownload = function * (itr: Iterable<CID>): Generator<AsyncIterable<() => Promise<{ cid: CID, block: Uint8Array }>>> {
		for (const cid of itr) {
			const remoteContent = remoteContents.find(r => cid.equals(r.cid));
			const priority = remoteContent?.priority ?? 100;
			const weight = Math.ceil(linearWeightTranslation(priority / 100) * SLOTS);

			const downloader = components.pinManager.downloadPin(cid);

			yield take(weight, downloader);
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

	await pipe(
		pins,
		batchDownload,
		i => parallelMerge<AsyncIterable<() => Promise<{ cid: CID, block: Uint8Array }>>[]>(...i),
		i => parallel(i, { concurrency: SLOTS, ordered: false }),
		logSpeed,
		i => collect(i)
	);

	//logger.tick("FINISHED");
};

/*
file://node_modules/@libp2p/kad-dht/src/query/query-path.ts:227
      deferred.reject(new CodeError('Query aborted', 'ERR_QUERY_ABORTED'))
                      ^
CodeError: Query aborted
    at EventTarget.<anonymous> (file://node_modules/@libp2p/kad-dht/src/query/query-path.ts:227:23)
    at EventTarget.[nodejs.internal.kHybridDispatch] (node:internal/event_target:757:20)
    at EventTarget.dispatchEvent (node:internal/event_target:692:26)
    at abortSignal (node:internal/abort_controller:369:10)
    at AbortController.abort (node:internal/abort_controller:403:5)
    at EventTarget.onAbort (file://node_modules/any-signal/src/index.ts:14:16)
    at EventTarget.[nodejs.internal.kHybridDispatch] (node:internal/event_target:757:20)
    at EventTarget.dispatchEvent (node:internal/event_target:692:26)
    at abortSignal (node:internal/abort_controller:369:10)
    at AbortController.abort (node:internal/abort_controller:403:5) {
  code: 'ERR_QUERY_ABORTED',
  props: {}
}
*/
