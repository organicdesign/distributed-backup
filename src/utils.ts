import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
import { base36 } from "multiformats/bases/base36";
import { Datastore, Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays";
import type { Helia } from "@helia/interface";


interface DatastorePin {
	depth: number
	metadata: Record<string, string | number | boolean>
}

interface DatastorePinnedBlock {
	pinCount: number
	pinnedBy: Uint8Array[]
}

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

export const addPinRef = async ({ datastore }: { datastore: Datastore }, cid: CID, options?: { depth?: number }): Promise<void> => {
	if (cid.version === 0) {
		cid = cid.toV1();
	}

	const pinKey= new Key(`/pin/${cid.toString(base36)}`);

	if (await datastore.has(pinKey)) {
		throw new Error("Already pinned");
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
