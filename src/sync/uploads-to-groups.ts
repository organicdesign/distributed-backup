import * as logger from "../logger.js";
import { CID } from "multiformats/cid";
import type { Components } from "../interface.js";

const addUploads = async (components: Components) => {
	const uploads = await components.content.findAll({ where: { state: "UPLOADING" } });

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
				path: upload.path,
				timestamp: Date.now(),
				author: components.welo.identity.id,
				encrypted: upload.encrypted,
				links: [],
				blocks: await components.pinManager.getBlockCount(upload.cid),
				size: await components.pinManager.getSize(upload.cid),
				priority: upload.priority
			});

			/*
			if (upload.versions.length !== 0) {
				await components.groups.addLinks(group, upload.versions[0], [ { type: "next", cid: upload.cid } ]);
			}
			*/

			upload.state = "COMPLETED";

			await upload.save();
		}
	}
};

const removeUploads = async (components: Components) => {
	const uploads = await components.content.findAll({ where: { state: "DESTROYED" } });

	await Promise.all(uploads.map(async u => {
		await components.groups.deleteFrom(u.path, u.group);
		await components.pinManager.unpin(u.cid);
		await u.destroy();
	}));
};

export const uploadsToGroups = async (components: Components) => {
	await Promise.all([
		addUploads(components),
		removeUploads(components)
	]);
};
