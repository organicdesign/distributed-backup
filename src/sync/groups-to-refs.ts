import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "../logger.js";
import { type Components, EncodedEntry } from "../interface.js";

export const groupsToRefs = async (components: Components) => {
	const { groups, remoteContent } = components;

	for (const { value: database } of groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = EncodedEntry.parse(dagCbor.decode(pair.value));
			const cid = CID.parse(pair.key.baseNamespace());
			const group = database.address.cid;
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			if (entry == null) {
				const ref = await remoteContent.findOne({
					where: {
						cid: cid.toString(),
						group: group.toString()
					}
				});

				if (ref != null) {
					ref.state = "DESTROYED";

					await ref.save();

					logger.references(`[-] ${group}/${cid}`);
				}

				const local = await components.localContent.findOne({ where: { cid: cid.toString() } });

				if (local != null) {
					local.state = "DESTROYED";

					await local.save();

					logger.uploads(`[-] ${group}/${cid}`);
				}

				continue;
			}

			// Check if we have uploaded this item...
			const local = await components.localContent.findOne({ where: { cid: cid.toString() } });

			if (local) {
				// We have uploaded it - no need to download it.
				continue;
			}

			// Check if we already have this item...
			const reference = await remoteContent.findOne({
				where: {
					cid: cid.toString(),
					group: group.toString()
				}
			});

			if (reference != null) {
				continue;
			}

			await remoteContent.create({
				cid,
				group,
				timestamp: new Date(entry.timestamp),
				state: "DOWNLOADING",
				encrypted: entry.encrypted,
				priority: entry.priority
			});

			logger.references(`[+] ${group}/${cid}`);

			/*
			logger.pins(`[~] ${cid}`);

			await components.dm.pin(cid);
			*/
		}
	}
};
