import Path from "path";
// import * as logger from "../logger.js";
import { queryContent } from "../utils.js";
import type { Components } from "../interface.js";

export const uploadsToGroups = async (components: Components) => {
	// Handle 'put' actions...
	for await (const { group, entry, path, remove } of queryContent(components, "uploads", "put")) {
		const paths = [
			Path.join(path, "ROOT"),
			Path.join(path, components.libp2p.peerId.toString(), entry.sequence?.toString() ?? "0")
		];

		await Promise.all(paths.map(path => components.groups.addTo(group, { ...entry, path })));

		await remove();
	}
};
