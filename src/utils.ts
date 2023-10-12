import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
import * as dagWalkers from "../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { AbortOptions } from "@libp2p/interface";
import type { Helia } from "@helia/interface";
import type { Blockstore } from "interface-blockstore";

export const srcPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

export const safePin = async (helia: Helia, cid: CID) => {
	if (!await helia.pins.isPinned(cid)) {
		await helia.pins.add(cid);
	}
};

export const safeUnpin = async (helia: Helia, cid: CID) => {
	if (await helia.pins.isPinned(cid)) {
		await helia.pins.rm(cid);
	}
};

export const safeReplace = async (helia: Helia, oldCid: CID, newCid: CID) => {
	await safePin(helia, newCid);
	await safeUnpin(helia, oldCid);
};

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
	return cborg.encode(data);
};

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
	return cborg.decode(data);
};

export const walkDag = async function * (blockstore: Blockstore, cid: CID, maxDepth?: number, options?: AbortOptions): AsyncGenerator<() => Promise<{ cid: CID, depth: number, block: Uint8Array }>> {
	const queue: Array<() => Promise<{ cid: CID, depth: number, block: Uint8Array }>> = [];
	const promises: Array<Promise<{ cid: CID, depth: number, block: Uint8Array }>> = [];

	const enqueue = (cid: CID, depth: number): void => {
		queue.push(async () => {
			const promise = Promise.resolve().then(async () => {
				const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

				if (dagWalker == null) {
					throw new Error(`No dag walker found for cid codec ${cid.code}`);
				}

				const block = await blockstore.get(cid, options);

				if (maxDepth == null || depth < maxDepth) {
					for await (const cid of dagWalker.walk(block)) {
						enqueue(cid, depth + 1);
					}
				}

				return { cid, depth, block };
			});

			promises.push(promise);

			return promise;
		});
	}

	enqueue(cid, 0);

	while (queue.length + promises.length !== 0) {
		const func = queue.shift();

		if (func == null) {
			await promises.shift();

			continue;
		}

		yield func;
	}
};

export const linearWeightTranslation = (p: number) => {
	return 1 - p;
};

export const logWeightTranslation = (p: number) => {
	return 1 - Math.log10((10 - 1) * p - 1);
};
