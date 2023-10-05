import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import selectChunker from "../fs-importer/select-chunker.js";
import selectHasher from "../fs-importer/select-hasher.js";
import * as logger from "../logger.js";
import { sequelize } from "../database/sequelize.js";
import { Op } from "sequelize";
import type { Components } from "../interface.js";
import type { ImporterConfig } from "../fs-importer/interfaces.js";

export const diskToUploads = async (components: Components) => {
	const uploads = await components.uploads.findAll({
		where: {
			autoUpdate: true,
			[Op.or]: [
				{ state: "COMPLETED" },
				{ state: "REPLACING" }
			]
		}
	});
///
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

		await sequelize.transaction(async transaction => {
			upload.state = "REPLACED";

			const replacing = await components.uploads.findOne({ where: { cid: cid.toString() } });

			await Promise.all([
				(async () => {
					if (replacing == null) {
						await components.uploads.create({
							cid,
							path: upload.path,
							state: "REPLACING",
							cidVersion: upload.cidVersion,
							rawLeaves: upload.rawLeaves,
							chunker: upload.chunker,
							hash: upload.hash,
							nocopy: upload.nocopy,
							encrypt: upload.encrypt,
							timestamp: new Date(),
							autoUpdate: upload.autoUpdate,
							replaces: upload.cid
						}, { transaction });
					} else {
						replacing.state = "REPLACING";
						replacing.replaces = upload.cid;

						await replacing.save({ transaction });
					}
				})(),

				// Need to make sure this gets unpinned.
				// Destroying the upload will mean re-downloading it.
				//upload.destroy({ transaction }),
				upload.save({ transaction })
			]);
		});

		logger.validate("updated %s", upload.path);
	}
};
