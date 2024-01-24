import Path from "path";
import all from "it-all";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import * as raw from "multiformats/codecs/raw";
import selectRevisions from "./select-revisions.js";
import { OperationManager } from "./operation-manager.js";
import { decodeEntry, encodeEntry } from "./utils.js";
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

		await components.pinManager.process(group, path, dagCbor.encode(encodeEntry(entry)), true);

		const paths = [
			Path.join(DATA_KEY, path),
			Path.join(VERSION_KEY, path, components.libp2p.peerId.toString(), entry.sequence.toString())
		];

		for (const path of paths) {
			await components.groups.addTo(group, { ...entry, path });
		}

		// Handle revisions.

		if (database == null) {
			throw new Error("unable to get group");
		}

		const index = database.store.index;

		const rawRevisions = await all(index.query({ prefix: Path.join("/", VERSION_KEY, path) }));

		const revisions = rawRevisions.filter(r => dagCbor.decode(r.value) != null).map(r => ({
			value: EncodedEntry.parse(dagCbor.decode(r.value)),
			key: r.key.toString()
		}));

		// Filter revisions.
		const selectedRevisions = selectRevisions(revisions);

		for (const { key: path } of revisions) {
			const hasSelectedOld = selectedRevisions.find(r => r.key === path) != null;

			if (hasSelectedOld) {
				continue;
			}

			await components.groups.deleteFrom(group, path);
			await components.pinManager.remove(group, path);
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
