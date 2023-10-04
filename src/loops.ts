import * as logger from "./logger.js";
import { syncFromGroups } from "./sync/sync-from-groups.js";
import { syncFromDisk } from "./sync/sync-from-disk.js";
import type { Components } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.tick("started");

	await syncFromGroups(components);
	await syncFromDisk(components);
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
