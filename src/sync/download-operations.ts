import Path from "path";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry, encodeAny } from "../utils.js";
import * as logger from "../logger.js";
import type { EncodedEntry, Components } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager">) => {
	const om = new OperationManager(components.stores.get("download-operations"), {
		put: async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
			const group = CID.decode(groupData);
			const entry = decodeEntry(encodedEntry);

			logger.references(`[+] ${group}${path}`);

			await components.stores.get("pin-references").put(new Key(Path.join(entry.cid.toString(), group.toString(), path)), encodeAny(encodedEntry));
			await components.pinManager.pin(entry.cid);
		}
	});

	await om.start();

	return om;
};
