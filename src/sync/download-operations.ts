import Path from "path";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import type { EncodedEntry, Components } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager">) => {
	const om = new OperationManager(components.stores.get("download-operations"), {
		put: async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
			const group = CID.decode(groupData);
			const entry = decodeEntry(encodedEntry);

			logger.references(`[+] ${group}${path}`);

			await components.pinManager.pin(entry.cid);

			await components.stores.get("reverse-lookup").put(new Key(Path.join(entry.cid.toString(), group.toString(), path)), new Uint8Array());
		}
	});

	await om.start();

	return om;
};
