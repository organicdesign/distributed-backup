import fs from "fs";
import Path from "path";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import * as dagPb from "@ipld/dag-pb";
import crypto from "crypto";
import { deriveEncryptionParams } from "../utils.js"
import * as raw from "multiformats/codecs/raw";
import { toString as uint8ArrayToString } from "uint8arrays";
import type { PBLink } from "@ipld/dag-pb";
import type { Blockstore } from "interface-blockstore";
import type { ImportResult, ImporterConfig } from "./interfaces.js";

export const importFile = async (path: string, config: ImporterConfig, blockstore?: Blockstore): Promise<ImportResult> => {
	const key = new Uint8Array([0, 1, 2, 3]);
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const encryptionParamStream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const { key: aesKey, iv } = await deriveEncryptionParams(key, encryptionParamStream);
	const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv, { encoding: "binary" });
	const { size } = await fs.promises.stat(path);
	const links: { cid: CID, size: number, chunk: Uint8Array }[] = [];

	for await (const rawData of config.chunker(stream)) {
		const chunk = cipher.update(rawData);

		const block = dagPb.encode({
			Data: chunk,
			Links: []
		});

		const multihash = await config.hasher.digest(block);
		const cid = CID.create(config.cidVersion, raw.code, multihash);

		await blockstore?.put(cid, block);

		links.push({ cid, size: block.length, chunk });
	}

	let block: Uint8Array;

	if (links.length === 1) {
		// If the file is only one block don't wrap it.
		block = dagPb.encode({
			Data: new UnixFS({ type: "file", blockSizes: [], data: links[0].chunk }).marshal(),
			Links: []
		});
	} else {
		block = dagPb.encode({
			Data: new UnixFS({ type: "file", blockSizes: links.map(l => BigInt(l.size)) }).marshal(),
			Links: links.map(l => ({ Hash: l.cid, Tsize: l.size }))
		});
	}

	const multihash = await config.hasher.digest(block);
	const cid = CID.create(config.cidVersion, dagPb.code, multihash);

	await blockstore?.put(cid, block);

	return { cid, size };
}

export const importDir = async (path: string, config: ImporterConfig, blockstore?: Blockstore): Promise<ImportResult> => {
	const key = new Uint8Array([0, 1, 2, 3]);
	const dirents = await fs.promises.readdir(path, { withFileTypes: true });
	const links: PBLink[] = [];

	for (const dirent of dirents) {
		const subPath = Path.join(path, dirent.name);

		const { cid, size } = dirent.isDirectory() ?
			await importDir(subPath, config, blockstore) :
			await importFile(subPath, config, blockstore);

		links.push({ Hash: cid, Tsize: size, Name: dirent.name });
	}

	const block = dagPb.encode({
		Data: new UnixFS({ type: 'directory' }).marshal(),
		Links: links
	});

	const hash = await config.hasher.digest(block);
	const cid = CID.create(config.cidVersion, dagPb.code, hash);
	const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

	await blockstore?.put(cid, block);

	return { cid, size };
}

export const importAny = async (path: string, config: ImporterConfig, blockstore?: Blockstore): Promise<ImportResult> => {
	const stat = await fs.promises.stat(path);

	if (stat.isDirectory()) {
		return await importDir(path, config, blockstore);
	} else {
		return await importFile(path, config, blockstore);
	}
}
