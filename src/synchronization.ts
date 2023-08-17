import * as dagCbor from "@ipld/dag-cbor";
import * as dagPb from "@ipld/dag-pb";
import { CID } from "multiformats/cid";
import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { safePin, safeUnpin } from "./utils.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import { sequelize } from "./database/index.js";
import { UnixFS } from "ipfs-unixfs";
import type { Entry, Components, ImportOptions, Reference, Link } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

const unpinIfLast = async ({ references, helia, pins }: Pick<Components, "helia" | "references" | "pins">, cid: CID) => {
	const { count } = await references.findAndCountAll({ where: { cid: cid.toString() } });

	if (count <= 1) {
		await Promise.all([
			safeUnpin(helia, cid),
			pins.destroy({ where: { cid: cid.toString() } })
		]);
	}
};

export const downSync = async (components: Components) => {
	const { groups, references, helia, pins } = components;

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
					group: group.toString()
				}
			});

			if (entry == null) {
				await deleteAll(components, { cid, group });

				continue;
			}

			if (existing != null) {
				continue;
			}

			logger.references(`[+] ${group}/${cid}`);

			const [pin] = await pins.findOrCreate({
				where: {
					cid: cid.toString()
				},

				defaults: {
					cid,
					blocks: 0,
					size: 0,
					diskBlocks: 0,
					diskSize: 0,
					pinned: false
				}
			});

			const ref = await references.create({
				cid,
				group,
				timestamp: new Date(entry.timestamp),
				blocked: false,
				encrypted: entry.encrypted,
				destroyed: false
			});

			components.dm.add(cid);
			// await safePin(helia, cid);

			// pin.pinned = true;

			await ref.save();
		}
	}
};

export const addLocal = async ({ groups, references, uploads, helia, welo, pins, unixfs }: Components, data: Reference & ImportOptions & { links?: Link[] }) => {
	const [ [pin], upload ] = await sequelize.transaction(async transaction => {
		const block = await helia.blockstore.get(data.cid);
		const decoded = dagPb.decode(block);
		const size = block.length + decoded.Links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

		return await Promise.all([
			pins.findOrCreate({
				where: {
					cid: data.cid.toString()
				},

				defaults: {
					cid: data.cid,
					blocks: 1,
					size,
					diskBlocks: 0,
					diskSize: 0,
					pinned: false
				},

				transaction
			}),

			uploads.create({
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
			}),

			references.create({
				cid: data.cid,
				group: data.group,
				blocked: false,
				encrypted: data.encrypt,
				timestamp: new Date(),
				destroyed: false
			}, { transaction })
		]);
	});

	pin.pinned = true;
	upload.grouped = true;

	await Promise.all([
		safePin(helia, data.cid).then(() => pin.save()),

		groups.addTo(data.group, {
			cid: data.cid,
			timestamp: Date.now(),
			author: welo.identity.id,
			encrypted: data.encrypt,
			links: data.links ?? []
		}).then(() => upload.save())
	]);

	logger.references(`[+] ${data.group}/${data.cid}`);
};

export const replaceLocal = async ({ groups, references, uploads, helia, welo, pins }: Components, data: Reference & { oldCid: CID }) => {
	const [ oldRef, oldUpload ] = await Promise.all([
		references.findOne({ where: { cid: data.oldCid.toString(), group: data.group.toString() } }),
		uploads.findOne({ where: { cid: data.oldCid.toString(), group: data.group.toString() } })
	]);

	if (oldUpload == null || oldRef == null) {
		throw new Error("upload should exist");
	}

	const [ [ref], [pin] ] = await sequelize.transaction(async transaction => {
		return await Promise.all([
			references.findOrCreate({
				where: {
					cid: data.cid.toString(),
					group: data.group.toString()
				},

				defaults: {
					cid: data.cid,
					group: data.group,
					blocked: false,
					encrypted: oldUpload.encrypt,
					timestamp: new Date(),
					destroyed: false
				},

				transaction
			}),

			pins.findOrCreate({
				where: {
					cid: data.cid.toString()
				},

				defaults: {
					cid: data.cid,
					blocks: 0,
					size: 0,
					diskBlocks: 0,
					diskSize: 0,
					pinned: false
				},

				transaction
			}),

			uploads.findOrCreate({
				where: {
					cid: data.cid.toString(),
					group: data.group.toString()
				},

				defaults: {
					cid: data.cid,
					group: data.group,
					checkedAt: new Date(),
					grouped: false,
					path: oldUpload.path,
					cidVersion: oldUpload.cidVersion,
					hash: oldUpload.hash,
					chunker: oldUpload.chunker,
					rawLeaves: oldUpload.rawLeaves,
					nocopy: oldUpload.nocopy,
					encrypt: oldUpload.encrypt
				},

				transaction
			}),

			oldRef.save({ transaction }),
			oldUpload.destroy({ transaction })
		]);
	});

	pin.pinned = true;
	oldUpload.grouped = true;

	await Promise.all([
		safePin(helia, data.cid).then(() => pin.save()),

		groups.addTo(data.group, {
			cid: data.cid,
			timestamp: Date.now(),
			author: welo.identity.id,
			encrypted: ref.encrypted,
			links: []
		}).then(() =>
			groups.addLinks(data.group, data.oldCid, [ { type: "next", cid: data.cid } ])
		).then(() => oldUpload.save())
	]);

	logger.references(`[+] ${data.group}/${data.cid}`);
};

export const deleteAll = async ({ helia, references, pins, groups, uploads }: Components, { cid, group }: Reference) => {
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
		unpinIfLast({ references, helia, pins }, cid)
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

	const localRefs = await uploads.findAll();

	for (const ref of localRefs) {
		if (Date.now() - ref.checkedAt.getTime() < config.validateInterval * 1000) {
			continue;
		}

		// logger.validate("outdated %s", ref.path);

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

			// logger.validate("cleaned %s", ref.path);
			continue;
		}

		// logger.validate("updating %s", ref.path);

		const { cid } = await load(ref.path, importerConfig, blockstore, cipher);

		await replaceLocal(components, { group: ref.group, cid, oldCid: ref.cid });

		// logger.validate("updated %s", ref.path);
	}
};
