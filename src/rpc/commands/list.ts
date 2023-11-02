import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import { countPeers } from "../../utils.js";
import type { Components, Entry } from "../../interface.js";

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
			const entry = dagCbor.decode(pair.value) as Entry<Uint8Array>;

			if (entry == null) {
				continue;
			}

			if (entry.links.find(l => l.type === "next")) {
				continue;
			}

			const item = CID.decode(entry.cid);

			promises.push((async () => {
				return {
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
					meta: entry.meta
				};
			})());
		}
	}

	return await Promise.all(promises);
};
