import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "../logger.js";
import type { Entry, Components } from "../interface.js";

export const groupsToRefs = async (components: Components) => {
	const { groups, references } = components;

	for (const { value: database } of groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = dagCbor.decode(pair.value) as Entry;
			const cid = CID.parse(pair.key.baseNamespace());
			const group = database.address.cid;
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			if (entry == null) {
				//await deleteAll(components, { cid, group });

				continue;
			}

			// Check if we have uploaded this item...
			const local = await components.uploads.findOne({ where: { cid: cid.toString() } });

			if (local) {
				// We have uploaded it - no need to download it.
				continue;
			}

			// Check if we already have this item...
			const reference = await references.findOne({
				where: {
					cid: cid.toString(),
					group: group.toString()
				}
			});

			if (reference != null) {
				continue;
			}

			logger.references(`[+] ${group}/${cid}`);

			await references.create({
				cid,
				group,
				timestamp: new Date(entry.timestamp),
				state: "DOWNLOADING",
				encrypted: entry.encrypted
			});

			logger.pins(`[~] ${cid}`);

			await components.dm.pin(cid);
		}
	}
};
