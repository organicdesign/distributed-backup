import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import type { Components, Entry } from "../../interface.js";

export const name = "list-groups";

export const method = (components: Components) => async () => {
	const promises: Promise<{ cid: string, name: string, count: number, peers: number }>[] = [];

	for (const { key: cid, value: database } of components.groups.all()) {
		promises.push((async () => {
			const index = await database.store.latest();
			let items = 0;
			let peers = 0;

			await Promise.all([
				(async () => {
					try {
						for await (const pair of index.query({})) {
							const entry = dagCbor.decode(pair.value) as Entry;

							if (entry != null) {
								items++;
							}
						}
					} catch (error) {
						// Do nothing
					}
				})(),
				(async () => {
					try {
						for await (const _ of components.libp2p.services.dht.findProviders(CID.parse(cid), { signal: AbortSignal.timeout(1000) })) {
							peers++;
						}
					} catch (error) {
						// Do nothing
					}
				})()
			]);

			return { cid, name: database.manifest.name, count: items, peers };
		})());
	}

	return await Promise.all(promises);
};
