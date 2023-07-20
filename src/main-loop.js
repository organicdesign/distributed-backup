import * as logger from "./logger.js";

export default async () => {
	logger.tick("started");

	/*
	for (const item of (await handler.query()).values() as Iterable<{ path: Uint8Array, cid: Uint8Array, encrypted: boolean }>) {
		const path = uint8ArrayToString(await cms.decrypt(item.path));
		const cid = CID.decode(item.cid);
		const timestamp = timestamps.get(path) ?? 0;

		if (Date.now() - timestamp < config.validateInterval * 1000) {
			continue;
		}

		logger.validate("outdated %s", path);

		const importerConfig: ImporterConfig = {
			chunker: selectChunker(),
			hasher: selectHasher(),
			cidVersion: 1
		};

		const { cid: newCid } = item.encrypted ?
			await importAnyEncrypted(path, importerConfig, aesKey) :
			await importAnyPlaintext(path, importerConfig);

		if (newCid.equals(cid)) {
			timestamps.set(path, Date.now());

			logger.validate("cleaned %s", path);
			continue;
		}

		logger.validate("updating %s", path);

		if (item.encrypted) {
			await importAnyEncrypted(path, importerConfig, aesKey, blockstore);
		} else {
			await importAnyPlaintext(path, importerConfig, blockstore);
		}

		if (!await helia.pins.isPinned(newCid)) {
			logger.add("pinning %s", path);
			await helia.pins.add(newCid);
		}

		await helia.pins.rm(cid);

		await handler.replace(cid, newCid);

		timestamps.set(path, Date.now());

		logger.validate("updated %s", path);
	}
	*/

	logger.tick("finished");
};
