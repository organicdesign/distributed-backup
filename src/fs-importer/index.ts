import fs from "fs";
import * as dagPb from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import { UnixFS } from "ipfs-unixfs";
import { PBLink, prepare, encode } from "@ipld/dag-pb";
import type { Filestore } from "../filestore/index.js";

const DEFAULT_CHUNK_SIZE = 262144;

export class FsImporter {
	private readonly blockstore: Filestore;

	constructor (helia: { blockstore: Filestore }) {
		this.blockstore = helia.blockstore;
	}

	async addFile (path: string) {
		const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
		const chunker = fixedSize({ chunkSize: 30000 });
		const stat = await fs.promises.stat(path);
		const links: PBLink[] = [];

		if (stat.size <= DEFAULT_CHUNK_SIZE) {
			const chunk = await fs.promises.readFile(path);
			const multihash = await sha256.digest(chunk);
			const cid = CID.create(1, 0x55, multihash);

			await this.blockstore.putLink(cid, path, 0n, BigInt(stat.size));

			return cid;
		}

		let offset = 0n;

		for await (const chunk of chunker(stream)) {
			// If encryption is required - add it here.
			const block = encode({ Data: new UnixFS({ type: "raw", data: chunk }).marshal(), Links: [] });
			const multihash = await sha256.digest(block);
			const cid = CID.create(1, dagPb.code, multihash);
			const size = BigInt(block.length);

			await this.blockstore.putLink(cid, path, offset, size);

			links.push({ Hash: cid });

			offset += size;
		}

		const node = {
			Data: new UnixFS({ type: "file" }).marshal(),
			Links: links
		};

		const block = encode(prepare(node));
		const multihash = await sha256.digest(block);
		const cid = CID.create(1, dagPb.code, multihash);

		await this.blockstore.put(cid, block);

		return cid;
	}
}
