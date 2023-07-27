import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import type { Entry, Components } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

const syncRefs = async ({ groups, references }: Components) => {
	for (const { value: database } of groups.all()) {
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = dagCbor.decode(pair.value) as Entry;

			const pref = {
				cid: CID.parse(pair.key.baseNamespace()),
				group: database.address.cid
			};

			if (entry == null) {
				const existing = await references.get(pref);
				if (existing != null) {
					// Don't delete outright.
					await references.set({
						...existing,
						status: "removed"
					});
				}

				continue;
			}

			if (await references.has(pref)) {
				continue;
			}

			await references.set({
				...pref,
				...entry,
				group: database.address.cid,
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
			await pins.rm(ref.cid, ref.group);

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

export const upSync = async ({ groups, helia, pins, blockstore, references, config, cipher }: Components) => {
	for await (const ref of references.all()) {
		if (
			ref.local?.path == null ||
			ref.status == "removed" ||
			Date.now() - ref.local.updatedAt < config.validateInterval * 1000
		) {
			continue;
		}

		logger.validate("outdated %s", ref.local.path);

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

			logger.validate("cleaned %s", ref.local.path);
			continue;
		}

		logger.validate("updating %s", ref.local.path);

		const { cid: newCid } = await load(ref.local.path, importerConfig, blockstore, cipher);

		if (!await helia.pins.isPinned(newCid)) {
			logger.add("pinning %s", ref.local.path);
			await helia.pins.add(newCid);
			await pins.add(newCid, ref.group);
		}

		if (await helia.pins.isPinned(ref.cid)) {
			await helia.pins.rm(ref.cid);
			await pins.rm(ref.cid, ref.group);
		}

		const timestamp = Date.now();

		await references.set({
			...ref,
			cid: newCid,

			local: {
				...ref.local,
				updatedAt: timestamp
			}
		});

		await groups.addTo(ref.group, {
			...ref,
			cid: newCid,
		});

		await references.delete({ cid: ref.cid, group: ref.group });

		await groups.deleteFrom(ref.cid, ref.group);

		logger.validate("updated %s", ref.local.path);
	}
};
