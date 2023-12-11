import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "../logger.js";
import { type Components, EncodedEntry } from "../interface.js";

export const groupsToRefs = async (components: Components) => {
	for (const { value: database } of components.groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = EncodedEntry.parse(dagCbor.decode(pair.value));
			const cid = CID.decode(entry.cid);
			const group = database.address.cid;
			const path = pair.key.toString();
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			if (entry == null) {
				logger.warn("Deletion was detected but is not implemented.");
				continue;
				/*
				const ref = await components.content.findOne({
					where: {
						path,
						group: group.toString()
					}
				});

				if (ref != null) {
					ref.state = "DESTROYED";

					await ref.save();

					logger.references(`[-] ${group}/${cid}`);
				}

				continue;
				*/
			}

			// Check if we have a reference...
			const pinState = await components.pinManager.getState(cid);

			if (!["NOTFOUND", "DESTORYED"].includes(pinState)) {
				// We already have it.
				continue;
			}

			await components.downloads.add("put", [group.bytes, path, entry]);
		}
	}
};
