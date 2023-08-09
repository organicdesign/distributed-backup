import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { safePin, safeUnpin } from "./utils.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { sequelize } from "./database/index.js";
import type { Entry, Components, ImportOptions, Reference } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

const unpinIfLast = async ({ references, helia }: Pick<Components, "helia" | "references">, cid: CID) => {
	const { count } = await references.findAndCountAll({ where: { cid: cid.toString() } });

	if (count <= 1) {
		await safeUnpin(helia, cid);
	}
};

export const downSync = async ({ groups, references, helia }: Components) => {
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
				await unpinIfLast({ references, helia }, cid);

				logger.references(`[-] ${group}/${cid}`);

				await existing?.destroy();

				continue;
			}

			if (existing != null) {
				continue;
			}

			logger.references(`[+] ${group}/${cid}`);

			const ref = await references.create({
				cid,
				group,
				author: entry.author,
				timestamp: new Date(entry.timestamp),
				blocked: false,
				downloaded: 0,
				encrypted: entry.encrypted,
				pinned: false,
				destroyed: false,
				links: []
			});

			await safePin(helia, cid);

			ref.pinned = true;

			await ref.save();
		}
	}
};

export const replaceAll = async (components: Components, oldCid: CID, data: Reference & ImportOptions) => {
	const oldRef = await components.references.findOne({
		where: {
			cid: oldCid.toString(),
			group: data.group.toString()
		}
	});

	if (oldRef != null) {
		//oldRef.next = data.cid;
	}

	await addAll(components, data);
/*
	await references.create({
		cid,
		group,
		timestamp: new Date(),
		author: welo.identity.id
	});
*/
	// We can't just replace either... we need to ensure garbage collection is done.
	//await safeReplace(helia, oldCid, ref.cid);
	// await pins.replace(oldCid, ref.cid, ref.group);
	// await references.replace(oldCid, ref);
	//await groups.replace(ref.group, oldCid, ref)
};

const addToGroup = async ({ groups, welo }: Pick<Components, "groups" | "welo">, data: Reference & ImportOptions) => {
	await groups.addTo(data.group, {
		cid: data.cid,
		timestamp: Date.now(),
		author: welo.identity.id,
		encrypted: data.encrypt,
		links: []
	});
};

export const addLocal = async (components: Components, data: Reference & ImportOptions) => {
	const [ ref, upload ] = await sequelize.transaction(async transaction => {
		return await Promise.all([
			components.references.create({
				cid: data.cid,
				group: data.group,
				author: components.welo.identity.id,
				blocked: false,
				downloaded: 100,
				encrypted: data.encrypt,
				timestamp: new Date(),
				pinned: false,
				destroyed: false,
				links: []
			}, { transaction }),

			components.uploads.create({
				cid: data.cid,
				group: data.group,
				cidVersion: data.cidVersion,
				path: data.path,
				rawLeaves: data.rawLeaves,
				chunker: data.chunker,
				hash: data.hash,
				nocopy: data.nocopy,
				encrypt: data.encrypt,
				checkedAt: new Date(),
				grouped: false
			})
		]);
	});

	ref.pinned = true;
	upload.grouped = true;

	await Promise.all([
		safePin(components.helia, data.cid).then(() => ref.save()),
		addToGroup(components, data).then(() => upload.save())
	]);

	logger.references(`[+] ${data.group}/${data.cid}`);
};

export const addAll = async ({ helia, groups, welo, references }: Components, data: Reference & ImportOptions) => {
	await safePin(helia, data.cid);

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
		blocked: false,
		pinned: false,
		destroyed: false,
		links: []
	});

	await groups.addTo(data.group, {
		...ref,
		timestamp: ref.timestamp.getDate(),
		links: []
	});
}

export const deleteAll = async ({ helia, references, groups, uploads }: Components, { cid, group }: Reference) => {
	const [ ref, upload ] = await Promise.all([
		references.findOne({ where: { cid: cid.toString(), group: group.toString() } }),
		uploads.findOne({ where: { cid: cid.toString(), group: group.toString() } })
	]);

	if (ref != null) {
		ref.destroyed = true;

		await ref.save();
	}

	await Promise.all([
		groups.deleteFrom(cid, group),
		unpinIfLast({ references, helia }, cid)
	]);

	await sequelize.transaction(async transaction => {
		await Promise.all([
			upload?.destroy({ transaction }),
			ref?.destroy({ transaction })
		])
	});
}

export const upSync = async (components: Components) => {
	const { blockstore, config, cipher, uploads } = components;

	const refs = await uploads.findAll();

	for (const ref of refs) {
		if (Date.now() - ref.checkedAt.getTime() < config.validateInterval * 1000) {
			continue;
		}

		//logger.validate("outdated %s", ref.local.path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(ref.chunker),
			hasher: selectHasher(ref.hash),
			cidVersion: ref.cidVersion
		};

		const load = ref.encrypt ? importAnyEncrypted : importAnyPlaintext;

		const { cid: hashCid } = await load(ref.path, importerConfig, new BlackHoleBlockstore(), cipher);

		if (hashCid.equals(ref.cid)) {
			ref.checkedAt = new Date();

			await ref.save();

			// logger.validate("cleaned %s", ref.local.path);
			continue;
		}

		// logger.validate("updating %s", ref.local.path);

		const { cid: newCid } = await load(ref.path, importerConfig, blockstore, cipher);

		/*
		await replaceAll(components, ref.cid, {
			group: ref.group,
			cid: newCid
		});
		*/

		//logger.validate("updated %s", ref.local.path);
	}
};
