import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { safeReplace, safePin, safeUnpin } from "./utils.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import type { Entry, Components, Reference } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

const syncRefs = async ({ groups, references }: Components) => {
	for (const { value: database } of groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = dagCbor.decode(pair.value) as Entry;
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			const pref = {
				cid: CID.parse(pair.key.baseNamespace()),
				group: database.address.cid
			};

			if (entry == null) {
				try {
					const existing = await references.get(pref);

					// Don't delete outright.
					await references.set({
						...existing,
						status: "removed"
					});
				} catch (error) {
					// Ignore since this just means it doesn't exist.
				}

				continue;
			}

			if (await references.has(pref)) {
				continue;
			}

			await references.set({
				...entry,
				...pref,
				status: "added"
			});
		}
	}
}

const syncPins = async ({ pins, references }: Components) => {
	for await (const ref of references.all()) {
		if (ref.status === "added") {
			await pins.add(ref.cid, ref.group);
		} else {
			await pins.delete(ref.cid, ref.group);

			if (ref.status != "blocked") {
				await references.delete({ cid: ref.cid, group: ref.group });
			}
		}
	}
}

export const downSync = async (components: Components) => {
	await syncRefs(components);
	await syncPins(components);
}

export const replaceAll = async ({ helia, references, groups, pins }: Components, oldCid: CID, ref: Reference) => {
	await safeReplace(helia, oldCid, ref.cid);
	await pins.replace(oldCid, ref.cid, ref.group);
	await references.replace(oldCid, ref);
	await groups.replace(ref.group, oldCid, ref)
}

export const addAll = async ({ helia, references, groups, pins }: Components, ref: Reference) => {
		await safePin(helia, ref.cid);
		await pins.add(ref.cid, ref.group);
		await references.set(ref);
		await groups.addTo(ref.group, ref);
}

export const deleteAll = async ({ helia, references, groups, pins }: Components, ref: Reference) => {
		await safeUnpin(helia, ref.cid);
		await pins.delete(ref.cid, ref.group);
		await references.delete(ref);
		await groups.deleteFrom(ref.cid, ref.group);
}

export const upSync = async (components: Components) => {
	const { blockstore, references, config, cipher } = components;
	for await (const ref of references.all()) {
		if (
			ref.local?.path == null ||
			ref.status == "removed" ||
			Date.now() - ref.local.updatedAt < config.validateInterval * 1000
		) {
			continue;
		}

		//logger.validate("outdated %s", ref.local.path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(ref.local.chunker),
			hasher: selectHasher(ref.local.hash),
			cidVersion: ref.local.cidVersion
		};

		const load = ref.encrypted ? importAnyEncrypted : importAnyPlaintext;

		const { cid: hashCid } = await load(ref.local.path, importerConfig, new BlackHoleBlockstore(), cipher);

		if (hashCid.equals(ref.cid)) {
			ref.timestamp = Date.now();

			references.set(ref);

			// logger.validate("cleaned %s", ref.local.path);
			continue;
		}

		// logger.validate("updating %s", ref.local.path);

		const { cid: newCid } = await load(ref.local.path, importerConfig, blockstore, cipher);

		const timestamp = Date.now();

		await replaceAll(components, ref.cid, {
			...ref,
			cid: newCid,

			local: {
				...ref.local,
				updatedAt: timestamp
			}
		});

		//logger.validate("updated %s", ref.local.path);
	}
};
