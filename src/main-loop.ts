import * as logger from "./logger.js";
import { importAny as importAnyEncrypted } from "./fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "./fs-importer/import-copy-plaintext.js";
import selectChunker from "./fs-importer/select-chunker.js";
import selectHasher from "./fs-importer/select-hasher.js";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import type { Components } from "./interface.js";
import type { ImporterConfig } from "./fs-importer/interfaces.js";

export default async ({ helia, blockstore, config, cipher, groups }: Components) => {
	logger.tick("started");

	for (const { value: group } of groups.all()) {
		for await (const item of group.all()) {
			if (item.local == null || Date.now() - item.local.updatedAt < config.validateInterval * 1000) {
				continue;
			}

			if (item.local.path == null) {
				logger.validate("outdated but is not local %s", item.cid);
				continue;
			}

			logger.validate("outdated %s", item.local.path);

			const importerConfig: ImporterConfig = {
				chunker: selectChunker(item.local.chunker),
				hasher: selectHasher(item.local.hash),
				cidVersion: item.local.cidVersion
			};

			const load = item.encrypted ? importAnyEncrypted : importAnyPlaintext;

			const { cid: hashCid } = await load(item.local.path, importerConfig, new BlackHoleBlockstore(), cipher);

			if (hashCid.equals(item.cid)) {
				group.updateTs(item);

				logger.validate("cleaned %s", item.local.path);
				continue;
			}

			logger.validate("updating %s", item.local.path);

			const { cid: newCid } = await load(item.local.path, importerConfig, blockstore, cipher);

			if (!await helia.pins.isPinned(newCid)) {
				logger.add("pinning %s", item.local.path);
				await helia.pins.add(newCid);
			}

			if (await helia.pins.isPinned(item.cid)) {
				await helia.pins.rm(item.cid);
			}

			const timestamp = Date.now();

			await group.add({
				...item,
				cid: newCid,

				local: {
					...item.local,
					updatedAt: timestamp
				}
			});

			await group.rm(item.cid);

			logger.validate("updated %s", item.local.path);
		}
	}

	logger.tick("finished");
};
