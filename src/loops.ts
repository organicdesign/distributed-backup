import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import { uploadsToGroups } from "./sync/uploads-to-groups.js";
import { refsToPins } from "./sync/refs-to-pins.js";
import type { Components } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.tick("started");

	await diskToUploads(components);
	await uploadsToGroups(components);
	await groupsToRefs(components);
	await refsToPins(components);

	// logger.tick("finished");
};

export const downloadLoop = async (components: Components) => {
	const pins = await components.dm.getActiveDownloads();

	for (const pin of pins) {
		const { done, value: f } = await components.dm.downloadPin(pin).next();

		if (!done) {
			await f();
		}
	}
};
