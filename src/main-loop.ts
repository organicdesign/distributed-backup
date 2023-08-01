import * as logger from "./logger.js";
import { downSync, upSync } from "./synchronization.js";
import type { Components } from "./interface.js";

export default async (components: Components) => {
	// logger.tick("started");

	await downSync(components);
	await upSync(components);

	// logger.tick("finished");
};
