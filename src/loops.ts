import { Op } from "sequelize";
import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import { uploadsToGroups } from "./sync/uploads-to-groups.js";
import { refsToPins } from "./sync/refs-to-pins.js";
import { linearWeightTranslation } from "./utils.js";
import * as logger from "./logger.js";
import { pipe } from "it-pipe";
import { take, parallelMap, collect } from "streaming-iterables";
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

export const downloadLoop = async (components: Components) => {
	//logger.tick("STARTED");
	const pins = await components.pinManager.getActiveDownloads();
	// logger.tick("GOT ACTIVE");

	const remoteContents = await components.remoteContent.findAll({
		where: {
			[Op.or]: pins.map(p => ({ cid: p.toString() }))
		}
	});
	// logger.tick("GOT REMOTE CONTENTS");

	const promises: Promise<unknown>[] = [];

	for (const pin of pins) {
		const remoteContent = remoteContents.find(r => pin.equals(r.cid));
		const priority = remoteContent?.priority ?? 100;
		const weight = Math.ceil(linearWeightTranslation(priority / 100) * 100); // The 100 here is the max number of slots per pin.

		promises.push((async () => {
			const promises: Promise<unknown>[] = [];

			for (let i = 0; i < weight; i++) {
				try {
					await pipe(
						components.pinManager.downloadPin(pin),
						i => take(weight, i),
						parallelMap(Infinity, (f: () => Promise<CID>) => f()),
						i => collect(i)
					);
				} catch (error) {
					console.error(`failed to download pin: ${pin}`, error);
				}
			}

			await Promise.all(promises);
		})());
	}

	await Promise.all(promises);
	//logger.tick("FINISHED");
};
////
