import fs from "fs";
import Path from "path";
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import { UnixFS } from "ipfs-unixfs";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import * as dagPb from "@ipld/dag-pb";
import type { PBLink } from "@ipld/dag-pb";
import type { ImportResult } from "./interfaces.js";
import type { Blockstore } from "interface-blockstore";

export const importFile = async (path: string, blockstore?: Blockstore): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const { size } = await fs.promises.stat(path);
	const chunker = fixedSize();
	const links: { cid: CID, size: number, chunk: Uint8Array }[] = [];

	for await (const chunk of chunker(stream)) {
		const block = dagPb.encode({
			Data: new UnixFS({ type: "file", blockSizes: [], data: chunk }).marshal(),
			Links: []
		});

		const multihash = await sha256.digest(block);
		const cid = CID.createV1(dagPb.code, multihash);

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

	const multihash = await sha256.digest(block);
	const cid = CID.createV1(dagPb.code, multihash);

	await blockstore?.put(cid, block);

	return { cid, size };
}
/*
export const importDir = async (path: string, unixfs: UnixFS): Promise<ImportResult> => {
	const dirents = await fs.promises.readdir(path, { withFileTypes: true });

	let rootCid = await unixfs.addDirectory();
	let totalSize = 0;

	for (const dirent of dirents) {
		const subPath = Path.join(path, dirent.name);

		const { cid, size } = dirent.isDirectory() ?
			await importDir(subPath, unixfs) :
			await importFile(subPath, unixfs);

		totalSize += size;
		rootCid = await unixfs.cp(cid, rootCid, dirent.name);
	}

	return { cid: rootCid, size: totalSize };
}
*/
export const importAny = async (path: string, blockstore: Blockstore): Promise<ImportResult> => {
	const stat = await fs.promises.stat(path);
	//const unixfs = createUnixFs({ blockstore });

	if (stat.isDirectory()) {
		//return await importDir(path, unixfs);
	} else {
		return await importFile(path, blockstore);
	}
}
