import fs from "fs";
import Path from "path";
import * as dagPb from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import { UnixFS } from "ipfs-unixfs";
import { PBLink, prepare, encode } from "@ipld/dag-pb";
import type { Filestore } from "../filestore/index.js";

const DEFAULT_CHUNK_SIZE = 1000;//262144;

export class FsImporter {
	private readonly blockstore: Filestore;

	constructor (helia: { blockstore: Filestore }) {
		this.blockstore = helia.blockstore;
	}

	async addFile (path: string) {
		const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
		const chunker = fixedSize({ chunkSize: DEFAULT_CHUNK_SIZE });
		const stat = await fs.promises.stat(path);
		const links: PBLink[] = [];

		if (stat.size <= DEFAULT_CHUNK_SIZE) {
			const chunk = await fs.promises.readFile(path);
			const cid = await this.addChunk(chunk, path, 0n);

			return { cid, size: chunk.length };
		}

		let offset = 0n;
		const blockSizes: bigint[] = [];

		for await (const chunk of chunker(stream)) {
			// If encryption is required - add it here.
			const size = BigInt(chunk.length);
			const cid = await this.addChunk(chunk, path, offset);

			links.push({ Hash: cid, Tsize: chunk.length });
			blockSizes.push(size);
			offset += size;
		}

		const block = encode(prepare({
			Data: new UnixFS({ type: "file", blockSizes }).marshal(),
			Links: links
		}));

		const multihash = await sha256.digest(block);
		const cid = CID.createV1(dagPb.code, multihash);
		const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

		await this.blockstore.put(cid, block);

		return { cid, size };
	}

	async addDir (path: string) {
		const dirents = await fs.promises.readdir(path, { withFileTypes: true });
		const links: PBLink[] = [];

		for (const dirent of dirents) {
			const subPath = Path.join(path, dirent.name);

			const { cid, size } = dirent.isDirectory() ?
				await this.addDir(subPath) :
				await this.addFile(subPath);

			links.push({ Hash: cid, Name: dirent.name, Tsize: size });
		}

		const metadata = new UnixFS({
			type: 'directory'
		});

		const block = dagPb.encode({
			Data: metadata.marshal(),
			Links: links
		});

		const hash = await sha256.digest(block);
		const cid = CID.createV1(dagPb.code, hash);
		const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

		await this.blockstore.put(cid, block);

		return { cid, size };
	}

	private async addChunk (data: Uint8Array, path: string, offset: bigint) {
		const multihash = await sha256.digest(data);
		const cid = CID.createV1(raw.code, multihash);
		const size = BigInt(data.length);

		await this.blockstore.putLink(cid, path, offset, size);

		return cid;
	}
}
