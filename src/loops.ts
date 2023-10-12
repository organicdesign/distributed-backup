import { Op } from "sequelize";
import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import { uploadsToGroups } from "./sync/uploads-to-groups.js";
import { refsToPins } from "./sync/refs-to-pins.js";
import { linearWeightTranslation } from "./utils.js";
import type { Components } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.tick("started");

	//console.log("syncing to uploads");
	await diskToUploads(components);
	//console.log("syncing to groups");
	await uploadsToGroups(components);
	//console.log("syncing to references");
	await groupsToRefs(components);
	//console.log("syncing to pins");
	await refsToPins(components);
	//console.log("syncing complete");

	// logger.tick("finished");
};

export const downloadLoop = async (components: Components) => {
	const pins = await components.pinManager.getActiveDownloads();

	const remoteContents = await components.remoteContent.findAll({
		where: {
			[Op.or]: pins.map(p => ({ cid: p.toString() }))
		}
	});

	for (const pin of pins) {
		const remoteContent = remoteContents.find(r => pin.equals(r.cid));
		const priority = remoteContent?.priority ?? 100;
		const weight = Math.ceil(linearWeightTranslation(priority / 100) * 10);

		for (let i = 0; i < weight; i++) {
			const { done, value: f } = await components.pinManager.downloadPin(pin).next();

			if (!done) {
				await f();
			} else {
				break;
			}
		}
	}
};
