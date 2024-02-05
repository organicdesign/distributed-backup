import exportPlaintext from "./export-plaintext.js";
import type { Blockstore } from "interface-blockstore";
import type { CID } from "multiformats/cid";

export const fsExport = async (blockstore: Blockstore, path: string, cid: CID) => {
	return await exportPlaintext(blockstore, path, cid);
};
