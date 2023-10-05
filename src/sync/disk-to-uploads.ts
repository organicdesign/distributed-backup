import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import selectChunker from "../fs-importer/select-chunker.js";
import selectHasher from "../fs-importer/select-hasher.js";
import * as logger from "../logger.js";
import { sequelize } from "../database/sequelize.js";
import type { Components } from "../interface.js";
import type { ImporterConfig } from "../fs-importer/interfaces.js";

export const diskToUploads = async (components: Components) => {
	const uploads = await components.uploads.findAll({
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

		logger.validate("updating %s", upload.path);

		const { cid } = await load(upload.path, importerConfig, components.blockstore, components.cipher);
		const existingUpload = await components.uploads.findOne({ where: { cid: cid.toString(), group: upload.group.toString() } });
		const versions = [upload.cid, ...upload.versions].slice(0, upload.versionCount);
		const versionsToRemove = [upload.cid, ...upload.versions].slice(upload.versionCount);

		upload.autoUpdate = false;
		upload.replacedBy = cid;

		await sequelize.transaction(transaction => Promise.all([
			components.uploads.findOrCreate({
				where: {
					cid: cid.toString(),
					group: upload.group.toString()
				},

				defaults: {
					cid,
					group: upload.group,
					path: upload.path,
					state: "UPLOADING",
					cidVersion: upload.cidVersion,
					rawLeaves: upload.rawLeaves,
					chunker: upload.chunker,
					hash: upload.hash,
					nocopy: upload.nocopy,
					encrypt: upload.encrypt,
					timestamp: new Date(),
					versionCount: upload.versionCount,
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

			versionsToRemove.map(v => components.uploads.destroy({
				where: {
					cid: v.toString(),
					group: upload.group.toString()
				},

				transaction
			}))
		]));

		// Need to make sure this gets unpinned.
		// Destroying the upload will mean re-downloading it.
		// const replacing = await components.uploads.findOne({ where: { cid: cid.toString(), group: upload.group.toString() } });

		//replacing.destroy(),

		logger.validate("updated %s", upload.path);
	}
};
