import * as cborg from 'cborg'
import { base36 } from "multiformats/bases/base36";
import { Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import { CustomProgressEvent, type ProgressOptions } from "progress-events";
import type { CID, Version } from "multiformats";
import type { Helia } from "@helia/interface";
import type { GetBlockProgressEvents } from "@helia/interface/src/blocks.js";
import type { AbortOptions } from "interface-store";
import type { AddOptions, AddPinEvents } from "@helia/interface/pins";

const DATASTORE_PIN_PREFIX = "/pin/";
const DATASTORE_BLOCK_PREFIX = "/pinned-block/";
const DATASTORE_ENCODING = base36;

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

const updatePinnedBlock = async (helia: Helia, cid: CID, options: AddOptions): Promise<DatastorePinnedBlock> => {
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

	if (pinnedBlock.pinCount === 0) {
		if (await helia.datastore.has(blockKey)) {
			await helia.datastore.delete(blockKey)
			return pinnedBlock;
		}
	}

	await helia.datastore.put(blockKey, cborg.encode(pinnedBlock), options)
	options.onProgress?.(new CustomProgressEvent<CID>('helia:pin:add', { detail: cid }))

	return pinnedBlock;
};

const walkDag = async function * (helia: Helia, cid: CID, options: WalkDagOptions): AsyncGenerator<{ block: Uint8Array, pinnedBlock: DatastorePinnedBlock }> {
	if (options.depth === -1) {
		return
	}

	const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

	if (dagWalker == null) {
		throw new Error(`No dag walker found for cid codec ${cid.code}`)
	}

	const block = await helia.blockstore.get(cid, options)

	yield { block, pinnedBlock: await updatePinnedBlock(helia, cid, options) };

	// walk dag, ensure all blocks are present
	for await (const cid of dagWalker.walk(block)) {
		yield* walkDag(helia, cid, {
			...options,
			depth: options.depth - 1
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

	for await (const {pinnedBlock, block} of walkDag(helia, cid, { ...options, depth })) {
		// do not update pinned block if this block is already pinned by this CID
		if (pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, cid.bytes)) != null) {
			return
		}

		pinnedBlock.pinCount++
		pinnedBlock.pinnedBy.push(cid.bytes)

		yield block;
	}

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
