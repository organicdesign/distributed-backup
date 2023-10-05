import * as logger from "./logger.js";
import { groupsToRefs } from "./sync/groups-to-refs.js";
import { diskToUploads } from "./sync/disk-to-uploads.js";
import type { Components } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.tick("started");

	await groupsToRefs(components);
	await diskToUploads(components);
	//await upSync(components);//

	// logger.tick("finished");
};

export const downloadLoop = async (components: Components) => {
	const pins = await components.dm.getActiveDownloads();

	for (const pin of pins) {
		const { done, value: f } = await components.dm.downloadPin(pin).next();

		if (!done) {
			const cid = await f();

			logger.downloads(`[+] ${cid}`);
		} else {
			logger.pins(`[+] ${pin}`);
		}
	}
};
