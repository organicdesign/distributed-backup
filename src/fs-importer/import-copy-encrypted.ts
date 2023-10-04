import fs from "fs";
import Path from "path";
import { collect } from "streaming-iterables";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import * as dagPb from "@ipld/dag-pb";
import * as raw from "multiformats/codecs/raw";
import {
	fromString as uint8ArrayFromString,
	toString as uint8ArrayToString,
	concat as concatUint8Arrays
} from "uint8arrays";
import type { Blockstore } from "interface-blockstore";
import type { ImportResult, ImporterConfig, Cipher } from "./interfaces.js";

export const importFile = async (
	path: string,
	config: ImporterConfig,
	blockstore: Blockstore,
	cipher: Cipher
): Promise<ImportResult> => {
	const loadData = () => fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const { size } = await fs.promises.stat(path);
	const links: { cid: CID, size: number, chunk: Uint8Array }[] = [];
	const params = await cipher.generate(loadData());

	for await (const chunk of config.chunker(cipher.encrypt(loadData(), params))) {
		const block = dagPb.encode({
			Data: chunk,
			Links: []
		});

		const multihash = await config.hasher.digest(block);
		const cid = CID.create(config.cidVersion, raw.code, multihash);

		await blockstore.put(cid, block);

		links.push({ cid, size: block.length, chunk });
	}

	let block: Uint8Array;

	if (links.length === 1) {
		// If the file is only one block don't wrap it.
		block = dagPb.encode(dagPb.prepare({
			Data: new UnixFS({ type: "file", blockSizes: [], data: links[0].chunk }).marshal(),
			Links: []
		}));
	} else {
		block = dagPb.encode(dagPb.prepare({
			Data: new UnixFS({ type: "file", blockSizes: links.map(l => BigInt(l.size)) }).marshal(),
			Links: links.map(l => ({ Hash: l.cid, Tsize: l.size }))
		}));
	}

	const multihash = await config.hasher.digest(block);
	const cid = CID.create(config.cidVersion, dagPb.code, multihash);

	await blockstore.put(cid, block);

	return { cid, size };
}

export const importDir = async (
	path: string,
	config: ImporterConfig,
	blockstore: Blockstore,
	cipher: Cipher
): Promise<ImportResult> => {
	const dirents = await fs.promises.readdir(path, { withFileTypes: true });
	const links: { name: Uint8Array, size: number, cid: CID, iv: Uint8Array }[] = [];

	for (const dirent of dirents) {
		const subPath = Path.join(path, dirent.name);
		const nameBuf = uint8ArrayFromString(dirent.name);
		const load = dirent.isDirectory() ? importDir : importFile;

		const { cid, size } = await load(subPath, config, blockstore, cipher);

		const params = await cipher.generate([nameBuf]);
		const chunks = await collect(cipher.encrypt([nameBuf], params))
		const cipherText = concatUint8Arrays(chunks);

		links.push({ cid, size, iv: params.iv, name: cipherText });
	}

	links.sort((a, b) => Buffer.compare(a.name, b.name));

	const ivs = uint8ArrayFromString(JSON.stringify(links.map(l => l.iv)));

	const block = dagPb.encode(dagPb.prepare({
		Data: new UnixFS({ type: "directory", data: ivs }).marshal(),
		Links: links.map(l => ({
			Hash: l.cid,
			Tsize: l.size,
			Name: uint8ArrayToString(l.name, "base32")
		}))
	}));

	const hash = await config.hasher.digest(block);
	const cid = CID.create(config.cidVersion, dagPb.code, hash);
	const size = links.reduce((p, c) => p + c.size, 0);

	await blockstore.put(cid, block);

	return { cid, size };
}

export const importAny = async (path: string, config: ImporterConfig, blockstore: Blockstore, cipher: Cipher): Promise<ImportResult> => {
	const stat = await fs.promises.stat(path);
	const load = stat.isDirectory() ? importDir : importFile;

	return await load(path, config, blockstore, cipher);
}
