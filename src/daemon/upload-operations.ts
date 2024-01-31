import Path from "path";
import all from "it-all";
import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import selectRevisions from "./select-revisions.js";
import { OperationManager } from "./operation-manager.js";
import { decodeEntry, encodeEntry } from "./utils.js";
import { EncodedEntry, Components, VERSION_KEY, DATA_KEY } from "./interface.js";
import type { Datastore } from "interface-datastore";

export default async (components: Pick<Components, "pinManager" | "libp2p" | "groups" | "blockstore"> & { datastore: Datastore }) => {
	const put = async (groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>) => {
		const group = CID.decode(groupData);
		const entry = decodeEntry(encodedEntry);
		const database = components.groups.get(group);
		let sequence = 0;

		if (database != null) {
			const obj = await database.store.selectors.get(database.store.index)(
				Path.join(DATA_KEY, path)
			);

			const data = EncodedEntry.parse(obj ?? null);

			if (data != null) {
				const entry = decodeEntry(data);

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
			await components.groups.addTo(group, path, entry);
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
		const selectedRevisions = selectRevisions(revisions, entry.revisionStrategy);

		for (const { key: path } of revisions) {
			const hasSelectedOld = selectedRevisions.find(r => r.key === path) != null;

			if (hasSelectedOld) {
				continue;
			}

			await components.groups.deleteFrom(group, path);
			await components.pinManager.remove(group, path);
		}
	};

	const om = new OperationManager(components.datastore, {
		put,

		delete: async (groupData: Uint8Array, path: string) => {
			const group = CID.decode(groupData);
			const database = components.groups.get(group);

			if (database == null) {
				throw new Error("no such group")
			}

			const index = database.store.index;

			for await (const { key } of index.query({ filters: [f => {
				const str = f.key.toString();

				return str.startsWith(Path.join("/", DATA_KEY, path, "/")) ||
					str === Path.join("/", DATA_KEY, path) ||
					str.startsWith(Path.join("/", "d", path, "/")) ||
					str === (Path.join("/", "d", path));
			}] })) {
				await components.groups.deleteFrom(group, key.toString());
				await components.pinManager.remove(group, key.toString());
			}
		}
	});

	await om.start();

	return om;
};
