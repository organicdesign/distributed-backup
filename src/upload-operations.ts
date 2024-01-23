import Path from "path";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";
import { OperationManager } from "./operation-manager.js";
import { decodeEntry, encodeEntry } from "./utils.js";
import * as logger from "./logger.js";
import { EncodedEntry, Components, VERSION_KEY, DATA_KEY } from "./interface.js";

export default async (components: Pick<Components, "stores" | "pinManager" | "libp2p" | "groups" | "blockstore">) => {
	const put = async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
		const group = CID.decode(groupData);
		const entry = decodeEntry(encodedEntry);
		const database = components.groups.get(group);
		let sequence = 0;

		if (database != null) {
			const data = await database.store.selectors.get(database.store.index)(
				Path.join(DATA_KEY, path)
			);

			if (data != null) {
				const entry = decodeEntry(EncodedEntry.parse(data));

				if (entry != null && entry.sequence != null) {
					sequence = entry.sequence + 1;
				}
			}
		}

		entry.sequence = sequence;

		await components.pinManager.pinLocal(group, path , entry.cid);

		logger.uploads(`[+] ${path}`);

		const paths = [
			Path.join(DATA_KEY, path),
			Path.join(VERSION_KEY, path, components.libp2p.peerId.toString(), entry.sequence.toString())
		];

		//await Promise.all(paths.map(path => components.groups.addTo(group, { ...entry, path })));

		for (const path of paths) {
			await components.groups.addTo(group, { ...entry, path });
		}
	};

	const om = new OperationManager(components.stores.get("upload-operations"), {
		put,

		delete: async (groupData: Uint8Array, path: string) => {
			const block = new Uint8Array([]);
			const multihash = await sha256.digest(block);
			const cid = CID.createV1(raw.code, multihash);

			await components.blockstore.put(cid, block);

			const entry = encodeEntry({
				cid,
				author: components.libp2p.peerId.toCID(),
				encrypted: false,
				blocks: 1,
				size: 0,
				timestamp: Date.now(),
				priority: 100,
				sequence: 0,
				revisionStrategy: "none"
			});

			await put(groupData, path, entry);
		}
	});

	await om.start();

	return om;
};
