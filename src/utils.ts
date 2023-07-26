import Path from "path";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { fileURLToPath } from "url";
import type { Helia } from "@helia/interface";
import type { CID } from "multiformats/cid";

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

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
	return uint8ArrayFromString(JSON.stringify(data));
};

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
	return JSON.parse(uint8ArrayToString(data));
};
