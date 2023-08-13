import * as cborg from 'cborg'
import { base36 } from "multiformats/bases/base36";
import { Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import { CustomProgressEvent } from "progress-events";
import type { CID, Version } from "multiformats";
import type { Helia } from "@helia/interface";
import type { AddOptions } from "@helia/interface/pins";

const DATASTORE_PIN_PREFIX = "/pin/";
const DATASTORE_BLOCK_PREFIX = "/pinned-block/";
const DATASTORE_ENCODING = base36;

interface DatastorePinnedBlock {
	pinCount: number
	pinnedBy: Uint8Array[]
}

interface DatastorePin {
	depth: number
	metadata: Record<string, string | number | boolean>
}

interface ResolvedCID {
	block: Uint8Array
	cid: CID
}

const toDSKey = (cid: CID): Key => {
	if (cid.version === 0) {
		cid = cid.toV1();
	}

	return new Key(`${DATASTORE_PIN_PREFIX}${cid.toString(DATASTORE_ENCODING)}`);
}

// Pin the block through helia
const pinBlock = async (helia: Helia, cid: CID, options: AddOptions) => {
	const blockKey = new Key(`${DATASTORE_BLOCK_PREFIX}${DATASTORE_ENCODING.encode(cid.multihash.bytes)}`)

	let pinnedBlock: DatastorePinnedBlock = {
		pinCount: 0,
		pinnedBy: []
	}

	try {
		pinnedBlock = cborg.decode(await helia.datastore.get(blockKey, options))
	} catch (err: any) {
		if (err.code !== 'ERR_NOT_FOUND') {
			throw err
		}
	}

	if (pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, cid.bytes)) == null) {
		pinnedBlock.pinCount++
		pinnedBlock.pinnedBy.push(cid.bytes)
	}

	if (pinnedBlock.pinCount === 0) {
		if (await helia.datastore.has(blockKey)) {
			await helia.datastore.delete(blockKey)
			return
		}
	}

	await helia.datastore.put(blockKey, cborg.encode(pinnedBlock), options)
	options.onProgress?.(new CustomProgressEvent<CID>('helia:pin:add', { detail: cid }))
};

export const add = async function * (helia: Helia, cid: CID<unknown, number, number, Version>, options: AddOptions & { concurrency?: number } = {}): AsyncGenerator<ResolvedCID[]> {
	const pinKey = toDSKey(cid)

	if (await helia.datastore.has(pinKey)) {
		throw new Error('Already pinned');
	}

	const depth = Math.round(options.depth ?? Infinity);

	if (depth < 0) {
		throw new Error('Depth must be greater than or equal to 0');
	}

	const concurrency = Math.round(options.concurrency ?? 1);

	if (concurrency < 1) {
		throw new Error('Concurrency must be greater than or equal to 1');
	}

	const queue = [{ cid, depth: 0 }];

	// Pull a block from the queue enqueing others.
	const pullFromQueue = async (): Promise<ResolvedCID> => {
		const item = queue.shift();

		if (item == null) {
			throw new Error("queue is empty");
		}

		const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === item.cid.code);

		if (dagWalker == null) {
			throw new Error(`No dag walker found for cid codec ${item.cid.code}`);
		}

		const block = await helia.blockstore.get(item.cid, options);

		if (item.depth < depth) {
			for await (const cid of dagWalker.walk(block)) {
				queue.push({ cid, depth: item.depth + 1 });
			}
		}

		return { cid, block };
	};

	// Pull multiple blocks from the queue in one go.
	const pullManyFromQueue = async (count: number): Promise<ResolvedCID[]> => {
		const promises: Promise<ResolvedCID>[] = [];
		const results: ResolvedCID[] = [];

		for (let i = 0; i < count; i++) {
			if (queue.length == 0) {
				const promise = promises.shift();

				if (promise == null) {
					break;
				}

				results.push(await promise);
				i--;
				continue;
			}

			promises.push(pullFromQueue());
		}

		return [...results, ...(await Promise.all(promises))];
	};

	while (queue.length != 0) {
		const blocks = await pullManyFromQueue(concurrency);

		await Promise.all(blocks.map(({ cid }) => pinBlock(helia, cid, options)));

		yield blocks;
	}

	const pin: DatastorePin = {
		depth,
		metadata: options.metadata ?? {}
	}

	await helia.datastore.put(pinKey, cborg.encode(pin), options)
}
