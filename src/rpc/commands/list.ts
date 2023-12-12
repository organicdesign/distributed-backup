import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import { countPeers } from "../../utils.js";
import * as logger from "../../logger.js";
import { decodeEntry, decodeAny } from "../../utils.js";
import { type Components, EncodedEntry } from "../../interface.js";

export const name = "list";

export const method = (components: Components) => async () => {
	const promises: Promise<{
		cid: string,
		name: string,
		revisions: number,
		peers: number,
		group: string,
		groupName: string,
		encrypted: boolean
	}>[] = [];

	for (const { key: cid, value: database } of components.groups.all()) {
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			if (decodeAny(pair.value) == null) {
				logger.warn("ignoring null value")
				continue;
			}

			const entry = EncodedEntry.optional().parse(dagCbor.decode(pair.value));

			if (entry == null) {
				continue;
			}

			if (entry.links.find(l => l.type === "next")) {
				continue;
			}

			const item = CID.decode(entry.cid);

			promises.push((async () => {
				const priorities: number[] = [];

				for await (const key of components.stores.get(`pin-references/${item.toString()}`).queryKeys({})) {
					const parts = key.toString().split("/");
					const group = CID.parse(parts[1]);
					const path = parts.slice(2).join("/");

					const database = components.groups.get(group);

					if (database == null) {
						logger.warn("Reverse lookup points to non-existant database: ", group);
						continue;
					}

					const paily = database.store.index;
					const data = await database.store.selectors.get(paily)(path);

					if (data == null) {
						continue;
					}

					const entry = decodeEntry(EncodedEntry.parse(data));

					priorities.push(entry.priority);
				}

				return {
					path: pair.key.toString(),
					cid: item.toString(),
					name: item.toString().slice(0, 8),
					revisions: 0,
					peers: await countPeers(components, item, { timeout: 3000 }),
					group: cid,
					groupName: database.manifest.name,
					encrypted: entry.encrypted,
					state: await components.pinManager.getState(item),
					size: await components.pinManager.getSize(item),
					blocks: await components.pinManager.getBlockCount(item),
					totalSize: entry.size,
					totalBlocks: entry.blocks,
					priority: Math.min(100, ...priorities)
				};
			})());
		}
	}

	return await Promise.all(promises);
};
