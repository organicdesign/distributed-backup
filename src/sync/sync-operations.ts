import Path from "path";
import * as dagCbor from "@ipld/dag-cbor";
import all from "it-all";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import selectRevisions from "../select-revisions.js";
import { EncodedEntry, Components, DATA_KEY, VERSION_KEY } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager"| "groups">) => {
	const om = new OperationManager(components.stores.get("download-operations"), {
		put: async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry, digest: Uint8Array) => {
			const groupCid = CID.decode(groupData);
			const entry = decodeEntry(encodedEntry);
			const tag = Path.join(groupCid.toString(), path);
			const store = components.stores.get("parsed-entries");

			logger.references(`[+] ${tag}`);

			await components.pinManager.pin(groupCid, path, entry.cid);

			//////////////////////////////////////////////////////////////////////////

			const pathParts = path.split("/");

			if (pathParts[1] === DATA_KEY) {
				// Query versions.
				const group = components.groups.get(groupCid);

				if (group == null) {
					throw new Error("unable to get group");
				}

				const index = group.store.index;

				pathParts[1] = VERSION_KEY;

				const rawRevisions = await all(index.query({ prefix: pathParts.join("/") }));

				const revisions = rawRevisions.map(r => ({
					value: EncodedEntry.parse(dagCbor.decode(r.value)),
					key: r.key.toString()
				}));

				// Filter revisions.
				const selectedRevisions = selectRevisions(revisions);

				for (const { key: path, value: revision } of revisions) {
					const hasSelectedOld = selectedRevisions.find(r => r.key === path) != null;

					if (hasSelectedOld) {
						continue;
					}

					const hasPinned = await components.pinManager.has(groupCid, path, CID.decode(revision.cid))

					if (!hasPinned) {
						continue;
					}

					logger.warn("revision needs to be deleted but it's not implemented");
				}

				for (const { key: path, value: revision } of selectedRevisions) {
					if (!(await store.has(new Key(path)))) {
						console.log("adding revision", path);
						await components.pinManager.pin(groupCid, path, CID.decode(revision.cid));

						await store.put(new Key(path), new Uint8Array());
					}
				}
			}

			////////////////////////////////////////////////////////////////////////

			// Create a reference now that we have processed it.
			await store.put(new Key(path), digest);
		}
	});

	await om.start();

	return om;
};
