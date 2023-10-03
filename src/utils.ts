import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
import { base36 } from "multiformats/bases/base36";
import { Datastore, Key } from "interface-datastore";
import type { Helia } from "@helia/interface";

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

	const pin = { depth, metadata: {} };

	await datastore.put(pinKey, cborg.encode(pin));
};
