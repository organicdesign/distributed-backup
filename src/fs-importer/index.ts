import fs from "fs";
import Path from "path";
import * as dagPb from "@ipld/dag-pb";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";
import { fixedSize } from "ipfs-unixfs-importer/chunker";
import { ImporterOptions as FullImporterOptions } from "ipfs-unixfs-importer";
import { UnixFS } from "ipfs-unixfs";
import { PBLink, prepare, encode } from "@ipld/dag-pb";
import type { Filestore } from "../filestore/index.js";
import { key, iv } from "../crypto/index.js";
import crypto from "crypto";

const DEFAULT_CHUNK_SIZE = 262144;

type ImporterOptions = Pick<FullImporterOptions, "chunker" | "cidVersion">;

export interface ImportResult {
	cid: CID,
	size: number
}

export class FsImporter {
	private readonly blockstore: Filestore;

	constructor (helia: { blockstore: Filestore }) {
		this.blockstore = helia.blockstore;
	}

	async addFile (path: string, options: Partial<ImporterOptions> = {}): Promise<ImportResult> {
		const cidVersion = options.cidVersion ?? 1;
		const cipher = crypto.createCipheriv("aes-256-cbc", key, iv, { encoding: "binary" });
		const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });
		const chunker = options.chunker ?? fixedSize({ chunkSize: DEFAULT_CHUNK_SIZE });
		const stat = await fs.promises.stat(path);
		const links: PBLink[] = [];

		if (stat.size <= DEFAULT_CHUNK_SIZE) {
			const rawChunk = await fs.promises.readFile(path);
			const chunk = cipher.update(rawChunk);
			const cid = await this.addChunk(chunk, path, 0n, iv, cidVersion);

			return { cid, size: chunk.length };
		}

		let offset = 0n;
		const blockSizes: bigint[] = [];

		let uIv = iv;

		for await (const rawChunk of chunker(stream)) {
			const chunk = cipher.update(rawChunk);
			// If encryption is required - add it here.
			const size = BigInt(chunk.length);
			const cid = await this.addChunk(chunk, path, offset, uIv, cidVersion);

			uIv = chunk.subarray(chunk.length - 16, chunk.length);

			links.push({ Hash: cid, Tsize: chunk.length });
			blockSizes.push(size);
			offset += size;
		}

		const block = encode(prepare({
			Data: new UnixFS({ type: "file", blockSizes }).marshal(),
			Links: links
		}));

		const multihash = await sha256.digest(block);
		const cid = CID.create(cidVersion, dagPb.code, multihash);
		const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

		await this.blockstore.put(cid, block);

		return { cid, size };
	}

	async addDir (path: string, options: Partial<ImporterOptions> = {}): Promise<ImportResult> {
		const cidVersion = options.cidVersion ?? 1;
		const dirents = await fs.promises.readdir(path, { withFileTypes: true });
		const links: PBLink[] = [];

		for (const dirent of dirents) {
			const subPath = Path.join(path, dirent.name);

			const { cid, size } = dirent.isDirectory() ?
				await this.addDir(subPath, options) :
				await this.addFile(subPath, options);

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
		const cid = CID.create(cidVersion, dagPb.code, hash);
		const size = links.reduce((p, c) => p + (c.Tsize ?? 0), 0);

		await this.blockstore.put(cid, block);

		return { cid, size };
	}

	private async addChunk (data: Uint8Array, path: string, offset: bigint, iv: Uint8Array, cidVersion: 0 | 1) {
		const multihash = await sha256.digest(data);
		const cid = CID.create(cidVersion, raw.code, multihash);
		const size = BigInt(data.length);

		await this.blockstore.putLink(cid, path, offset, size, iv);

		return cid;
	}
}
