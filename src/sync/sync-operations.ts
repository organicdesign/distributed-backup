import Path from "path";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import { EncodedEntry, Components, DATA_KEY, VERSION_KEY } from "../interface.js";

const REVISIONS_PER_INTERVAL = 3;
const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
const MS_IN_FORTNIGHT = MS_IN_WEEK * 2;
const MS_IN_MONTH = MS_IN_FORTNIGHT * 2;

const roundTo = (timestamp: number, mod: number) => {
	return timestamp - (timestamp % mod);
}

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

				const revisions: (EncodedEntry & { path: string })[] = [];

				for await (const { key, value } of index.query({ prefix: pathParts.join("/") })) {
					const entry = EncodedEntry.parse(dagCbor.decode(value));

					revisions.push({ path: key.toString(), ...entry });
				}

				// Filter revisions.

				// Get a list of target dates:
				const dates: number[] = [roundTo(Date.now(), MS_IN_DAY)];

				for (const interval of [MS_IN_DAY, MS_IN_WEEK, MS_IN_FORTNIGHT, MS_IN_MONTH]) {
					for (let i = 0; i < REVISIONS_PER_INTERVAL; i++) {
						dates.push(roundTo(dates[dates.length - 1], interval) - interval);
					}
				}

				const getRevisionClosestTo = (date: number) => {
					let selected = revisions[0];

					for (const revision of revisions) {
						if (Math.abs(date - revision.timestamp) < Math.abs(date - selected.timestamp)) {
							selected = revision;
						}
					}

					return selected;
				}

				const selectedRevisions: (EncodedEntry & { path: string })[] = [];

				for (const date of dates) {
					const revision = getRevisionClosestTo(date)

					if (selectedRevisions.includes(revision)) {
						continue;
					}

					selectedRevisions.push(revision);
				}

				for (const revision of revisions) {
					const hasSelectedOld = selectedRevisions.find(r => r.path === revision.path) != null;

					if (!hasSelectedOld) {
						logger.warn("Need to delete old revision but not implemented yet.");
					}
				}

				for (const revision of selectedRevisions) {
					if (!(await store.has(new Key(revision.path)))) {
						console.log("adding revision", revision.path);
						await components.pinManager.pin(groupCid, revision.path, CID.decode(revision.cid));

						await store.put(new Key(revision.path), new Uint8Array());
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
