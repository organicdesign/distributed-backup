import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import { countPeers } from "../../utils.js";
import * as logger from "../../logger.js";
import { decodeAny } from "../../utils.js";
import { type Components, EncodedEntry, LocalEntryData } from "../../interface.js";

export const name = "list";

export const method = (components: Components) => async () => {
	const promises: Promise<{
		cid: string,
		name: string,
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

			const item = CID.decode(entry.cid);

			let ref: Partial<LocalEntryData> | null = null;

			if (pair.key.toString().startsWith("/r")) {
				ref = await components.references.get(CID.parse(cid), pair.key.toString().slice(2));
			}

			promises.push((async () => {
				return {
					path: pair.key.toString(),
					cid: item.toString(),
					name: item.toString().slice(0, 8),
					peers: await countPeers(components, item, { timeout: 3000 }),
					group: cid,
					groupName: database.manifest.name,
					encrypted: entry.encrypted,
					state: await components.pinManager.getState(item),
					size: await components.pinManager.getSize(item),
					blocks: await components.pinManager.getBlockCount(item),
					totalSize: entry.size,
					totalBlocks: entry.blocks,
					priority: ref?.priority ?? entry.priority,
					revisionStrategy: ref?.revisionStrategy ?? entry.revisionStrategy
				};
			})());
		}
	}

	return await Promise.all(promises);
};
