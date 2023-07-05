import fs from "fs";
import Path from "path";
import { unixfs as createUnixFs, UnixFS } from "@helia/unixfs"
import type { ImportResult } from "./interfaces.js";
import type { Blockstore } from "interface-blockstore";

export const importFile = async (path: string, unixfs: UnixFS): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const cid = await unixfs.addFile({ content: stream });
	const { size } = await fs.promises.stat(path);

	return { cid, size };
}

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

export const importAny = async (path: string, blockstore: Blockstore): Promise<ImportResult> => {
	const stat = await fs.promises.stat(path);
	const unixfs = createUnixFs({ blockstore })

	if (stat.isDirectory()) {
		return await importDir(path, unixfs);
	} else {
		return await importFile(path, unixfs);
	}
}
