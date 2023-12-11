import Path from "path";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import type { EncodedEntry, Components } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager" | "libp2p" | "groups">) => {
	const om = new OperationManager(components.stores.get("upload-operations"), {
		put: async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
			const group = CID.decode(groupData);
			const entry = decodeEntry(encodedEntry);

			await components.pinManager.pinLocal(entry.cid);

			logger.uploads(`[+] ${path}`);

			const paths = [
				Path.join(path, "ROOT"),
				Path.join(path, components.libp2p.peerId.toString(), entry.sequence?.toString() ?? "0")
			];

			//await Promise.all(paths.map(path => components.groups.addTo(group, { ...entry, path })));

			for (const path of paths) {
				await components.stores.get("reverse-lookup").put(new Key(Path.join(entry.cid.toString(), group.toString(), path)), new Uint8Array());
				await components.groups.addTo(group, { ...entry, path });
			}
		}
	});

	await om.start();

	return om;
};
