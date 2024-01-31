import Path from "path";
import * as logger from "./logger.js";
import { type Components } from "./interface.js";

export default async (components: Components) => {
	for (const { value: database } of components.groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const group = database.address.cid;
			const path = pair.key.toString();

			if (path.startsWith("/d")) {
				continue;
			}

			// All we really want to do here is check for dirty entries.
			if (await components.pinManager.validate(group, path, pair.value)) {
				continue;
			}

			logger.entry("syncing update:", Path.join(group.toString(), path));

			await components.sync.add("put", [group.bytes, path, pair.value]);
		}
	}
};
