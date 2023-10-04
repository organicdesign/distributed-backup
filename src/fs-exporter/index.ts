import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import { CID } from "multiformats/cid";
import * as dagPb from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import Path from "path";
import fs from "fs/promises";
import type { Components } from "../interface.js";

export const exportFs = async ({ blockstore }: Components, cid: CID, path: string) => {
	const walk = async (cid: CID, path: string) => {
		const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

		if (dagWalker == null) {
			throw new Error(`No dag walker found for cid codec ${cid.code}`);
		}

		const block = await blockstore.get(cid);

		const data = dagPb.decode(block);

		if (data.Data == null) {
			throw new Error("data is null");
		}

		const fsData = UnixFS.unmarshal(data.Data);

		if (fsData.isDirectory()) {
			await fs.mkdir(path);

			for (const link of data.Links) {
				if (link.Name == null) {
					console.warn("link is missing name");
					continue;
				}

				await walk(link.Hash, Path.join(path, link.Name));
			}
		} else {
			if (fsData.data != null) {
				await fs.appendFile(path, fsData.data);
			}

			for (const link of data.Links) {
				await walk(link.Hash, path);
			}
		}
	};

	await walk(cid, path);
};
