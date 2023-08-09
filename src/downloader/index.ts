import * as cborg from 'cborg'
import { base36 } from "multiformats/bases/base36";
import { Key } from "interface-datastore";
import PQueue from "p-queue";
import defer from "p-defer";
import { equals as uint8ArrayEquals } from "uint8arrays";
import * as dagWalkers from "helia/src/utils/dag-walkers.js";
import { CustomProgressEvent, type ProgressOptions } from "progress-events";
import type { CID, Version } from "multiformats";
import type { Helia } from "@helia/interface";
import type { GetBlockProgressEvents } from "@helia/interface/src/blocks.js";
import type { AbortOptions } from "interface-store";
import type { AddOptions, AddPinEvents } from "@helia/interface/pins";

const DATASTORE_PIN_PREFIX = "/pin/";
const DATASTORE_BLOCK_PREFIX = "/pinned-block/";
const DATASTORE_ENCODING = base36;
const DAG_WALK_QUEUE_CONCURRENCY = 1;


interface DatastorePin {
	depth: number
	metadata: Record<string, string | number | boolean>
}

interface DatastorePinnedBlock {
  pinCount: number
  pinnedBy: Uint8Array[]
}

interface WalkDagOptions extends AbortOptions, ProgressOptions<GetBlockProgressEvents | AddPinEvents> {
  depth: number
}

const toDSKey = (cid: CID): Key => {
	if (cid.version === 0) {
		cid = cid.toV1();
	}

	return new Key(`${DATASTORE_PIN_PREFIX}${cid.toString(DATASTORE_ENCODING)}`);
}

const updatePinnedBlock = async (helia: Helia, cid: CID, withPinnedBlock: (pinnedBlock: DatastorePinnedBlock) => void, options: AddOptions): Promise<void> => {
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

    withPinnedBlock(pinnedBlock)

    if (pinnedBlock.pinCount === 0) {
      if (await helia.datastore.has(blockKey)) {
        await helia.datastore.delete(blockKey)
        return
      }
    }

    await helia.datastore.put(blockKey, cborg.encode(pinnedBlock), options)
    options.onProgress?.(new CustomProgressEvent<CID>('helia:pin:add', { detail: cid }))
  }

const walkDag = async (helia: Helia, cid: CID, queue: PQueue, withPinnedBlock: (pinnedBlock: DatastorePinnedBlock) => void, options: WalkDagOptions): Promise<void> => {
	if (options.depth === -1) {
		return
	}

	const dagWalker = dagWalkers[cid.code]

	if (dagWalker == null) {
		throw new Error(`No dag walker found for cid codec ${cid.code}`)
	}

	const block = await helia.blockstore.get(cid, options)

	await updatePinnedBlock(helia, cid, withPinnedBlock, options)

	// walk dag, ensure all blocks are present
	for await (const cid of dagWalker.walk(block)) {
		void queue.add(async () => {
			await walkDag(helia, cid, queue, withPinnedBlock, {
				...options,
				depth: options.depth - 1
			})
		})
	}
}

export const add = async function * (helia: Helia, cid: CID<unknown, number, number, Version>, options: AddOptions = {}): AsyncGenerator {
	const pinKey = toDSKey(cid)

	if (await helia.datastore.has(pinKey)) {
		throw new Error('Already pinned')
	}

	const depth = Math.round(options.depth ?? Infinity)

	if (depth < 0) {
		throw new Error('Depth must be greater than or equal to 0')
	}

	// use a queue to walk the DAG instead of recursion so we can traverse very large DAGs
	const queue = new PQueue({
		concurrency: DAG_WALK_QUEUE_CONCURRENCY
	})
	void queue.add(async (): Promise<void> => {
		await walkDag(helia, cid, queue, (pinnedBlock): void => {
			// do not update pinned block if this block is already pinned by this CID
			if (pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, cid.bytes)) != null) {
				return
			}

			pinnedBlock.pinCount++
			pinnedBlock.pinnedBy.push(cid.bytes)
		}, {
			...options,
			depth
		})
	})

	// if a job in the queue errors, throw that error
	const deferred = defer()

	queue.on('error', (err): void => {
		queue.clear()
		deferred.reject(err)
	})

	// wait for the queue to complete or error
	await Promise.race([
		queue.onIdle(),
		deferred.promise
	])

	const pin: DatastorePin = {
		depth,
		metadata: options.metadata ?? {}
	}

	await helia.datastore.put(pinKey, cborg.encode(pin), options)

	return {
		cid,
		...pin
	}
}
