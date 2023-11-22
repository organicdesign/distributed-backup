import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import selectChunker from "../fs-importer/select-chunker.js";
import selectHasher from "../fs-importer/select-hasher.js";
import * as logger from "../logger.js";
import { Op } from "sequelize";
import type { Components } from "../interface.js";
import type { ImporterConfig } from "../fs-importer/interfaces.js";

export const diskToUploads = async (components: Components) => {
	const uploads = await components.localContent.findAll({
		where: {
			autoUpdate: true,
			state: "COMPLETED"
		}
	});

	for (const upload of uploads) {
		if (Date.now() - upload.timestamp.getTime() < components.config.validateInterval * 1000) {
			continue;
		}

		logger.validate("outdated %s", upload.path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(upload.chunker),
			hasher: selectHasher(upload.hash),
			cidVersion: upload.cidVersion
		};

		const load = upload.encrypt ? importAnyEncrypted : importAnyPlaintext;

		const { cid: hashCid } = await load(upload.path, importerConfig, new BlackHoleBlockstore(), components.cipher);

		if (hashCid.equals(upload.cid)) {
			upload.timestamp = new Date();

			await upload.save();

			logger.validate("cleaned %s", upload.path);
			continue;
		}

		logger.add("importing %s", upload.path);

		const { cid } = await load(upload.path, importerConfig, components.blockstore, components.cipher);

		logger.add("imported %s", upload.path);

		// Save this.
		await components.pinManager.pinLocal(cid);

		const existingUpload = await components.localContent.findOne({ where: { cid: cid.toString(), group: upload.group.toString() } });
		const versions = [upload.cid, ...upload.versions].slice(0, upload.versionCount);
		const versionsToRemove = [upload.cid, ...upload.versions].slice(upload.versionCount);

		const uploadsToRemove = await components.localContent.findAll({
			where: {
				group: upload.group.toString(),
				[Op.or]: versionsToRemove.map(v => ({ cid: v.toString() }))
			}
		});

		upload.autoUpdate = false;
		upload.replacedBy = cid;

		await components.sequelize.transaction(transaction => Promise.all([
			components.localContent.findOrCreate({
				where: {
					cid: cid.toString(),
					group: upload.group.toString()
				},

				defaults: {
					cid,
					group: upload.group,
					path: upload.path,
					remotePath: upload.remotePath,
					state: "UPLOADING",
					cidVersion: upload.cidVersion,
					rawLeaves: upload.rawLeaves,
					chunker: upload.chunker,
					hash: upload.hash,
					nocopy: upload.nocopy,
					encrypt: upload.encrypt,
					timestamp: new Date(),
					versionCount: upload.versionCount,
					priority: upload.priority,
					autoUpdate: true,
					versions
				},

				transaction
			}),

			upload.save({ transaction }),

			(async () => {
				if (existingUpload != null) {
					existingUpload.autoUpdate = true;
					existingUpload.state = "UPLOADING";
					existingUpload.timestamp = new Date();
					existingUpload.versions = versions;
					existingUpload.versionCount = upload.versionCount;
					existingUpload.replacedBy = undefined;

					await existingUpload.save({ transaction });
				}
			})(),

			...uploadsToRemove.map(u => {
				u.state = "DESTROYED";

				return u.save({ transaction });
			})
		]));

		// Need to make sure this gets unpinned.
		// Destroying the upload will mean re-downloading it.
		/*await Promise.all(uploadsToRemove.map(async upload => {
			await components.groups.deleteFrom(upload.cid, upload.group);
			await components.pinManager.unpin(upload.cid);
			await upload.destroy();
		}));*/
	}
};
