import Path from "path";
import * as cborg from "cborg";
import { CID } from "multiformats/cid";
import { fileURLToPath } from "url";
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

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
	return cborg.encode(data);
};

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
	return cborg.decode(data);
};
