import Path from "path";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import { OperationManager } from "./operation-manager.js";
import { decodeEntry } from "./utils.js";
import * as logger from "./logger.js";
import { EncodedEntry, Components } from "./interface.js";

export default async (components: Pick<Components, "stores" | "pinManager"| "groups" | "monitor">) => {
	const om = new OperationManager(components.stores.get("sync-operations"), {
		put: async (groupData: Uint8Array, path: string, rawEntry: Uint8Array) => {
			const groupCid = CID.decode(groupData);
			const tag = Path.join(groupCid.toString(), path);
			const obj = dagCbor.decode(rawEntry);

			if (obj == null) {
				logger.references(`[-] ${tag}`);

				await components.pinManager.remove(groupCid, path);
			} else {
				const encodedEntry = EncodedEntry.parse(obj);
				const entry = decodeEntry(encodedEntry);

				logger.references(`[+] ${tag}`);

				await components.pinManager.pin(groupCid, path, entry.cid);
			}

			// Create a reference now that we have processed it.
			await components.monitor.add(groupCid, path, rawEntry);
		}
	});

	await om.start();

	return om;
};