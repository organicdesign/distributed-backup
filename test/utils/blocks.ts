import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";
import type { Blockstore } from "interface-blockstore";
import type { Helia } from "@helia/interface";

export const hashBlock = async (block: Uint8Array) => {
	const hash = await sha256.digest(block);

	return CID.createV1(raw.code, hash);
}

export const addBlock = async  ({ blockstore }: { blockstore: Blockstore }, block: Uint8Array): Promise<CID> => {
	const cid = await hashBlock(block);

	await blockstore.put(cid, block);

	return cid;
};


export const createBlocks = async () => {
	const blocks: { block: Uint8Array, cid: CID }[] = [];

	for (let i = 0; i < 100; i++) {
		const block = new Uint8Array([i, i, i]);
		const cid = await hashBlock(block);

		blocks.push({ block, cid });
	}

	return blocks;
};

export const addBlocks = async ({ blockstore }: { blockstore: Blockstore }) => {
	const blocks = await createBlocks();

	await Promise.all(blocks.map(b => addBlock({ blockstore }, b.block)));

	return blocks;
};

export const pinBlocks = async (helia: Helia) => {
	const blocks = await addBlocks(helia);

	await Promise.all(blocks.map(({ cid }) => helia.pins.add(cid)));
};
