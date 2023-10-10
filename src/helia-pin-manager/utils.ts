import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { base36 } from "multiformats/bases/base36";
import { Datastore, Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays";

interface DatastorePin {
	depth: number
	metadata: Record<string, string | number | boolean>
}

interface DatastorePinnedBlock {
	pinCount: number
	pinnedBy: Uint8Array[]
}

export const addPinRef = async ({ datastore }: { datastore: Datastore }, cid: CID, options?: { depth?: number }): Promise<void> => {
	if (cid.version === 0) {
		cid = cid.toV1();
	}

	const pinKey= new Key(`/pin/${cid.toString(base36)}`);

	if (await datastore.has(pinKey)) {
		return;
	}

	const depth = Math.round(options?.depth ?? Infinity)

	if (depth < 0) {
		throw new Error('Depth must be greater than or equal to 0')
	}

	const pin: DatastorePin = { depth, metadata: {} };

	await datastore.put(pinKey, cborg.encode(pin));
};

export const addBlockRef = async ({ datastore }: { datastore: Datastore }, cid: CID, by: CID): Promise<void> => {
	if (cid.version === 0) {
		cid = cid.toV1();
	}

	if (by.version === 0) {
		by = by.toV1();
	}

	const blockKey = new Key(`/pinned-block/${base36.encode(cid.multihash.bytes)}`);

	let pinnedBlock: DatastorePinnedBlock = { pinCount: 0, pinnedBy: [] };

	try {
		pinnedBlock = cborg.decode(await datastore.get(blockKey));
	} catch (err: any) {
		if (err.code !== 'ERR_NOT_FOUND') {
			throw err;
		}
	}

	if (pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, by.bytes)) != null) {
		return;
	}

	pinnedBlock.pinCount++;
	pinnedBlock.pinnedBy.push(by.bytes);

	await datastore.put(blockKey, cborg.encode(pinnedBlock));
};
