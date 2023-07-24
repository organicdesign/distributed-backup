import { CID } from "multiformats/cid";
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
		for await (const item of group.query({})) {
			if (Date.now() - item.local.timestamp < config.validateInterval * 1000) {
				continue;
			}

			const cid = CID.decode(item.group.cid);

			if (item.local.path == null) {
				logger.validate("outdated but is not local %s", cid);
				continue;
			}

			logger.validate("outdated %s", item.local.path);

			const importerConfig: ImporterConfig = {
				chunker: selectChunker(item.local.chunker),
				hasher: selectHasher(item.local.hash),
				cidVersion: item.local.cidVersion
			};

			const { cid: newCid } = item.group.encrypted ?
				await importAnyEncrypted(item.local.path, importerConfig, cipher, new BlackHoleBlockstore()) :
				await importAnyPlaintext(item.local.path, importerConfig, new BlackHoleBlockstore());

			if (newCid.equals(cid)) {
				group.updateTs(cid);

				logger.validate("cleaned %s", item.local.path);
				continue;
			}

			logger.validate("updating %s", item.local.path);

			if (item.group.encrypted) {
				await importAnyEncrypted(item.local.path, importerConfig, cipher, blockstore);
			} else {
				await importAnyPlaintext(item.local.path, importerConfig, blockstore);
			}

			if (!await helia.pins.isPinned(newCid)) {
				logger.add("pinning %s", item.local.path);
				await helia.pins.add(newCid);
			}

			if (await helia.pins.isPinned(cid)) {
				await helia.pins.rm(cid);
			}

			const timestamp = Date.now();

			await group.add({
				group: {
					...item.group,
					cid: newCid.bytes,
					timestamp
				},

				local: {
					...item.local,
					timestamp
				}
			});

			await group.rm(cid);

			logger.validate("updated %s", item.local.path);
		}
	}

	logger.tick("finished");
};
