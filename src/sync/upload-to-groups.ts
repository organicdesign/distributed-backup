import * as logger from "../logger.js";
import { CID } from "multiformats/cid";
import type { Components } from "../interface.js";

export const uploadToGroups = async (components: Components) => {
	const uploads = await components.uploads.findAll({ where: { state: "UPLOADING" } });

	if (uploads.length === 0) {
		// Nothing needs updating.
		return;
	}

	for (const { value: database, key } of components.groups.all()) {
		logger.validate("syncing group: %s", database.address.cid.toString());

		const group = CID.parse(key);

		for (const upload of uploads) {
			await components.groups.addTo(group, {
				cid: upload.cid,
				timestamp: Date.now(),
				author: components.welo.identity.id,
				encrypted: upload.encrypt,
				links: upload.replaces ? [ { type: "prev", cid: upload.replaces } ] : []
			});

			if (upload.replaces) {
				await components.groups.addLinks(group, upload.replaces, [ { type: "next", cid: upload.cid } ])
			}

			upload.state = "COMPLETED";

			await upload.save();
		}
	}
};
