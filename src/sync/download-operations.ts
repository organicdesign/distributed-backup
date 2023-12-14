import Path from "path";
import { CID } from "multiformats/cid";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import type { EncodedEntry, Components } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager">) => {
	const om = new OperationManager(components.stores.get("download-operations"), {
		put: async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
			const group = CID.decode(groupData);
			const entry = decodeEntry(encodedEntry);
			const tag = Path.join(group.toString(), path);

			logger.references(`[+] ${tag}`);

			await components.pinManager.pin(group, path, entry.cid);
		}
	});

	await om.start();

	return om;
};
