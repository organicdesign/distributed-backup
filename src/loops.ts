import * as logger from "./logger.js";
import { downSync, upSync } from "./synchronization.js";
import type { Components } from "./interface.js";

export const syncLoop = async (components: Components) => {
	// logger.tick("started");

	await downSync(components);
	await upSync(components);

	// logger.tick("finished");
};

export const downloadLoop = async (components: Components) => {
	console.log(await components.dm.download());
};
