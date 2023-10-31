/*import fs from "fs";
import crypto from "crypto";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import * as raw from "multiformats/codecs/raw";
import * as dagPb from "@ipld/dag-pb";
import * as cbor from "@ipld/dag-cbor";
import { UnixFS } from "ipfs-unixfs";
import { unixfs as createUnixFs } from "@helia/unixfs"
import type { Chunker } from "ipfs-unixfs-importer/chunker";
import type { PBLink } from "@ipld/dag-pb";
import type { Blockstore } from "interface-blockstore";
import type { ImportResult } from "./interfaces.js";
import type { Filestore } from "../filestore/index.js";

export const importFile = async (
	store: Blockstore,
	path: string,
	options: { chunker?: Chunker, key?: Uint8Array } = {}
): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });

	if (options.key == null) {
		const unixfs = createUnixFs({ blockstore: store });
		const cid = await unixfs.addFile({ content: stream }, options);
		const { size } = await fs.promises.stat(path);

		return { cid, size };
	}

	const chunker = options.chunker ?? fixedSize();
	const startingIv = crypto.randomBytes(16);
	const links: PBLink[] = [];
	const cipher = crypto.createCipheriv("aes-256-cbc", options.key, startingIv, { encoding: "binary" });

	let iv = startingIv;

	for await (let rawChunk of chunker(stream)) {
		const chunk = cipher.update(rawChunk);
		const block = cbor.encode({ data: chunk, iv });
		const multihash = await sha256.digest(block);
		const cid = CID.createV1(cbor.code, multihash);

		await store.put(cid, block);

		iv = chunk.subarray(chunk.length - 16, chunk.length);

		links.push({ Hash: cid, Tsize: block.length });
	}

	throw new Error("not implemented");

	// If there is only one chunk, just store it.
	if (links.length === 1) {
		const cid = links[0].Hash;
		const size = links[0].Tsize ?? 0;

		return { cid, size };
	}
};

export const importFileNocopy = async (
	store: Filestore,
	path: string,
	options: { chunker?: Chunker, key?: Uint8Array } = {}
): Promise<ImportResult> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
	const chunker = options.chunker ?? fixedSize();
	const links: PBLink[] = [];
	const blockSizes: bigint[] = [];

	let offset = 0n;
	let iv: Uint8Array | undefined;
	let cipher: crypto.Cipher | null = null;

	// If key is set, setup cipher
	if (options.key != null) {
		iv = crypto.randomBytes(16);
		cipher = crypto.createCipheriv("aes-256-cbc", options.key, iv, { encoding: "binary" });
	}

	// Chunk the file
	for await (let chunk of chunker(stream)) {
		if (cipher != null) {
			chunk = cipher.update(chunk);
		}

		const size = BigInt(chunk.length);
		const multihash = await sha256.digest(chunk);
		const cid = CID.createV1(raw.code, multihash);

		if (cipher == null) {
			await store.putLink({ key: cid, path, offset, size });
		} else {
			await store.putLink({ key: cid, path, offset, size, iv });

			iv = chunk.subarray(chunk.length - 16, chunk.length);
		}

		links.push({ Hash: cid, Tsize: chunk.length });
		blockSizes.push(size);
		offset += size;
	}

	// If there is only one chunk, just store it.
	if (links.length === 1) {
		const cid = links[0].Hash;
		const size = links[0].Tsize ?? 0;

		await store.putLink({ key: cid, path, offset: 0n,  size: BigInt(size) });

		return { cid, size };
	}

	const block = dagPb.encode(dagPb.prepare({
		Data: new UnixFS({ type: "file", blockSizes }).marshal(),
		Links: links
	}));

	const multihash = await sha256.digest(block);
	const cid = CID.createV1(dagPb.code, multihash);
	const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

	await store.put(cid, block);

	return { cid, size };
};
*/
