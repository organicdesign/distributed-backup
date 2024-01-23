import Path from "path";
import * as logger from "./logger.js";
import { decodeAny } from "./utils.js";
import { type Components, DATA_KEY } from "./interface.js";

export default async (components: Components) => {
	for (const { value: database } of components.groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({ prefix: Path.join("/", DATA_KEY)})) {
			const group = database.address.cid;
			const path = pair.key.toString();

			if (decodeAny(pair.value) == null) {
				logger.warn("deletion detected but is not implemented");
				continue;
			}

			// All we really want to do here is check for dirty entries.
			if (await components.monitor.check(group, path, pair.value)) {
				// We have already processed this entry.
				continue;
			}

			logger.entry("syncing update:", path)

			await components.sync.add("put", [group.bytes, path, pair.value]);
		}
	}
};
