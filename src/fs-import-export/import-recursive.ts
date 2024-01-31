import fs from "fs";
import Path from "path";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import * as dagPb from "@ipld/dag-pb";
import * as raw from "multiformats/codecs/raw";
import { parallelMerge } from "streaming-iterables"
import type { Blockstore } from "interface-blockstore";
import type { ImportResult, ImporterConfig } from "./interfaces.js";

export const importFile = async (blockstore: Blockstore, path: string, config: ImporterConfig): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const { size } = await fs.promises.stat(path);
	const links: { cid: CID, size: number, chunk: Uint8Array }[] = [];

	for await (const chunk of config.chunker(stream)) {
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

	await blockstore.put(cid, block);

	return { cid, size };
};

export const importDir = async function * (blockstore: Blockstore, path: string, config: ImporterConfig): AsyncIterable<ImportResult & { path: string }> {
	const stat = await fs.promises.stat(path);

	if (!stat.isDirectory()) {
		const result = await importFile(blockstore, path, config);

		yield { ...result, path };
		return;
	}

	const dirents = await fs.promises.readdir(path, { withFileTypes: true });

	const itrs = dirents.map(dirent => {
		const subPath = Path.join(path, dirent.name);

		return importDir(blockstore, subPath, config);
	})

	yield * parallelMerge(...itrs);
};

export default importDir;
