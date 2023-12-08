import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
import * as dagWalkers from "../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { AbortOptions } from "@libp2p/interface";
import type { Helia } from "@helia/interface";
import type { Blockstore } from "interface-blockstore";
import { Libp2p, EncodedEntry, Entry, Components } from "./interface.js";

export const projectPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

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

export const countPeers = async ({ libp2p }: { libp2p: Libp2p }, cid: CID, options?: { timeout: number }): Promise<number> => {
	let count = 0;

	const itr = libp2p.contentRouting.findProviders(cid, {
		signal: AbortSignal.timeout(options?.timeout ?? 3000)
	});

	try {
		for await (const _ of itr) {
			count++;
		}
	} catch (error) {
		// Do nothing
	}

	return count;
};

export const encodeEntry = (entry: Entry): EncodedEntry => {
	const ee: EncodedEntry = {
		...entry,
		cid: entry.cid.bytes,
		author: entry.author.bytes,
		links: entry.links.map(l => ({ ...l, cid: l.cid.bytes }))
	};

	// Parse will strip foreign keys...
	return EncodedEntry.parse(ee);
};

export const decodeEntry = (entry: EncodedEntry): Entry => ({
	...entry,
	cid: CID.decode(entry.cid),
	author: CID.decode(entry.author),
	links: entry.links.map(l => ({ ...l, cid: CID.decode(l.cid) }))
});

export const queryContent = async function * ({ stores }: Pick<Components, "stores">, context?: string, action?: string) {
	// /content/${context}/${action}/${group}/${path} -> Entry

	let storePath = "/";

	if (context != null) {
		storePath += `${context}/`;
	}

	if (action != null) {
		storePath += `${action}/`;
	}

	const store = stores.get("actions");

	for await (const pair of store.query({ prefix: storePath })) {
		const parts = pair.key.toString().split("/");

		yield {
			context: parts[1], // "download" | "upload" | "reference" | "pin"
			action: parts[2], // "put" | "delete"
			group: CID.parse(parts[3]),
			path: `/${parts.slice(4).join("/")}`,
			entry: decodeEntry(EncodedEntry.parse(decodeAny(pair.value))),
			remove: () => store.delete(pair.key)
		};
	}
}
