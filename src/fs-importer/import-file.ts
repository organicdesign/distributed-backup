import fs from "fs";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import * as raw from "multiformats/codecs/raw";
import * as dagPb from "@ipld/dag-pb";
import { PBLink, prepare, encode } from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import type { ImportResult, ImporterOptions } from "./interfaces.js";
import type { Filestore } from "../filestore/index.js";

export const importFileNocopy = async (store: Filestore, path: string, options: ImporterOptions): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const chunker = options.chunker ?? fixedSize();
	const links: PBLink[] = [];
	const blockSizes: bigint[] = [];

	let offset = 0n;

	// Chunk the file
	for await (const chunk of chunker(stream)) {
		const size = BigInt(chunk.length);
		const multihash = await sha256.digest(chunk);
		const cid = CID.createV1(raw.code, multihash);

		await store.putLink(cid, path, offset, size);

		links.push({ Hash: cid, Tsize: chunk.length });
		blockSizes.push(size);
		offset += size;
	}

	// If there is only one chunk, just store it.
	if (links.length === 1) {
		const cid = links[0].Hash;
		const size = links[0].Tsize ?? 0;

		await store.putLink(cid, path, 0n, BigInt(size));

		return { cid, size };
	}

	const block = encode(prepare({
		Data: new UnixFS({ type: "file", blockSizes }).marshal(),
		Links: links
	}));

	const multihash = await sha256.digest(block);
	const cid = CID.createV1(dagPb.code, multihash);
	const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

	await store.put(cid, block);

	return { cid, size };
};
