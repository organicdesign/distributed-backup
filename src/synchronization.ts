import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { safeReplace, safePin, safeUnpin } from "./utils.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { Reference as ReferenceModel } from "./database/index.js";
import type { Entry, Components, ImportOptions, Reference } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

const syncRefs = async ({ groups, references, helia }: Components) => {
	for (const { value: database } of groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({})) {
			const entry = dagCbor.decode(pair.value) as Entry;
			const cid = CID.parse(pair.key.baseNamespace());
			const group = database.address.cid;
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			const existing = await references.findOne({
				where: {
					cid: cid.toString(),
					group: database.address.cid.toString()
				}
			});

			if (entry == null) {
				const { count } = await references.findAndCountAll({ where: { cid: cid.toString() } });

				if (count <= 1) {
					await helia.pins.rm(cid);
				}

				logger.references(`[-] ${group}/${cid}`);

				await existing?.destroy();

				continue;
			}

			if (existing != null) {
				continue;
			}

			logger.references(`[+] ${group}/${cid}`);

			await references.create({
				cid,
				group,
				author: entry.author,
				timestamp: new Date(entry.timestamp),
				blocked: false,
				downloaded: 0,
				encrypted: entry.encrypted
			});
		}
	}
}

const syncPins = async ({}: Components) => {
	/*for await (const ref of references.all()) {
		if (ref.status === "added") {
			await pins.add(ref.cid, ref.group);
		} else {
			await pins.delete(ref.cid, ref.group);

			if (ref.status != "blocked") {
				await references.delete({ cid: ref.cid, group: ref.group });
			}
		}
	}*/
}

export const downSync = async (components: Components) => {
	await syncRefs(components);
	await syncPins(components);
}

export const replaceAll = async ({ helia, groups }: Components, oldCid: CID, {cid, group}: Reference) => {
	// We can't just replace either... we need to ensure garbage collection is done.
	//await safeReplace(helia, oldCid, ref.cid);
	// await pins.replace(oldCid, ref.cid, ref.group);
	// await references.replace(oldCid, ref);
	//await groups.replace(ref.group, oldCid, ref)
}

export const addAll = async ({ helia, groups, welo, references }: Components, data: Reference & ImportOptions) => {
	await safePin(helia, data.cid);
	//await pins.add(ref.cid, ref.group);
	//await references.set(ref);
	const ref = {
		cid: data.cid,
		group: data.group,
		author: welo.identity.id,
		timestamp: new Date(),
		encrypted: data.encrypt
	};

	await references.create({
		...ref,
		downloaded: 100,
		blocked: false
	});

	await groups.addTo(data.group, {
		...ref,
		timestamp: ref.timestamp.getDate()
	});
}

export const deleteAll = async ({ helia, references, groups }: Components, { cid, group }: Reference) => {
	// We need to check what is going on here - we can't just unpin something!
	await safeUnpin(helia, cid);
	// await pins.delete(ref.cid, ref.group);

	// Need to work out if we should unpin or not - see above.
	await references.destroy({
		where: {
			cid: cid.toString(),
			group: group.toString()
		}
	});

	// await references.delete(ref);
	await groups.deleteFrom(cid, group);
}

export const upSync = async (components: Components) => {
	/*const { blockstore, references, config, cipher } = components;
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
	}*/
};
