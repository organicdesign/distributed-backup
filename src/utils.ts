import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
import * as dagCbor from "@ipld/dag-cbor";
import type { RefStore } from "./ref-store.js";
import type { Entry } from "./interface.js";
import type { Pins } from "./pins.js";
import type { Groups } from "./groups.js";
import type { Helia } from "@helia/interface";

export const srcPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

export const safePin = async (helia: Helia, cid: CID) => {
	if (!await helia.pins.isPinned(cid)) {
		await helia.pins.add(cid);
	}
};

export const safeUnpin = async (helia: Helia, cid: CID) => {
	if (await helia.pins.isPinned(cid)) {
		await helia.pins.rm(cid);
	}
};

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
	return cborg.encode(data);
};

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
	return cborg.decode(data);
};

const syncRefs = async (refs: RefStore, groups: Groups) => {
	for (const { value: database } of groups.all()) {
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = dagCbor.decode(pair.value) as Entry;

			const pref = {
				cid: CID.parse(pair.key.baseNamespace()),
				group: database.address.cid
			};

			if (entry == null) {
				const existing = await refs.get(pref);
				if (existing != null) {
					// Don't delete outright.
					await refs.set({
						...existing,
						status: "removed"
					});
				}

				continue;
			}

			if (await refs.has(pref)) {
				continue;
			}

			await refs.set({
				...pref,
				...entry,
				group: database.address.cid,
				status: "added"
			});
		}
	}
}

const syncPins = async (pins: Pins, refs: RefStore) => {
	for await (const ref of refs.all()) {
		if (ref.status === "added") {
			await pins.add(ref.cid, ref.group);
		} else {
			await pins.rm(ref.cid, ref.group);
			await refs.delete({ cid: ref.cid, group: ref.group });
		}
	}
}

export const downSync = async (pins: Pins, refs: RefStore, groups: Groups) => {
	await syncRefs(refs, groups);
	await syncPins(pins, refs);
}
