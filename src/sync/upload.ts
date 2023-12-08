import Path from "path";
import { BlackHoleBlockstore } from "blockstore-core/black-hole";
import * as logger from "../logger.js";
import selectHasher from "../fs-importer/select-hasher.js";
import selectChunker from "../fs-importer/select-chunker.js";
import { importAny as importAnyEncrypted } from "../fs-importer/import-copy-encrypted.js";
import { importAny as importAnyPlaintext } from "../fs-importer/import-copy-plaintext.js";
import { Key } from "interface-datastore";
import { walkDag, encodeEntry, encodeAny, decodeAny, decodeEntry } from "../utils.js";
import { CID } from "multiformats/cid";
import { Components, ImportOptions, EncodedEntry } from "../interface.js";
import type { ImporterConfig } from "../fs-importer/interfaces.js";

export const executeUpload = async (components: Components, key: Key) => {
	const store = components.stores.get("actions/uploads/put");
	const entry = decodeEntry(decodeAny(await store.get(key)));
	const parts = key.toString().split("/");
	const group = CID.parse(parts[1]);
	const path = `/${parts.slice(2).join("/")}`;

	// Save this.
	await components.pinManager.pinLocal(entry.cid);

	logger.uploads(`[+] ${path}`);

	const paths = [
		Path.join(path, "ROOT"),
		Path.join(path, components.libp2p.peerId.toString(), entry.sequence?.toString() ?? "0")
	];

	//await Promise.all(paths.map(path => components.groups.addTo(group, { ...entry, path })));

	for (const path of paths) {
		await components.stores.get("reverse-lookup").put(new Key(Path.join(entry.cid.toString(), group.toString(), path)), new Uint8Array());
		await components.groups.addTo(group, { ...entry, path });
	}

	await store.delete(key);
};

export const addLocal = async (components: Components, params: ImportOptions & { group: CID, onlyHash?: boolean, priority: number, path: string, localPath: string }): Promise<CID> => {
	const { blockstore, cipher } = components;

	const config: ImporterConfig = {
		chunker: selectChunker(),
		hasher: selectHasher(),
		cidVersion: 1
	};

	if (!params.onlyHash) {
		logger.add("importing %s", params.localPath);
	}

	const store = params.onlyHash ? new BlackHoleBlockstore() : blockstore;
	const load = params.encrypt ? importAnyEncrypted : importAnyPlaintext;

	const { cid } = await load(params.localPath, config, store, cipher);

	if (params.onlyHash) {
		return cid;
	}

	logger.add("imported %s", params.localPath);

	let size = 0;
	let blocks = 0;

	for await (const getBlock of walkDag(blockstore, cid)) {
		const { block } = await getBlock();

		blocks++;
		size += block.length;
	}

	// Create the action record.
	const database = components.groups.get(params.group);
	let sequence = 0;

	if (database != null) {
		const data = await database.store.selectors.get(database.store.index)(
			Path.join(params.path, "ROOT")
		);

		if (data != null){
			const entry = decodeEntry(EncodedEntry.parse(data));

			if (entry != null && entry.sequence != null) {
				sequence = entry.sequence + 1;
			}
		}
	}

	const key = new Key(Path.join(params.group.toString(), params.path));

	const entry = {
		cid,
		sequence,
		blocks,
		size,
		encrypted: params.encrypt,
		timestamp: Date.now(),
		links: [],
		priority: params.priority,
		author: components.libp2p.peerId.toCID()
	};

	const value = encodeAny(encodeEntry(entry));

	await components.stores.get("actions/uploads/put").put(key, value);

	await executeUpload(components, key);

	return cid;
};
