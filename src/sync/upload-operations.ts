import Path from "path";
import { CID } from "multiformats/cid";
import { Key } from "interface-datastore";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";
import { OperationManager } from "../operation-manager.js";
import { decodeEntry, encodeAny, encodeEntry } from "../utils.js";
import * as logger from "../logger.js";
import { EncodedEntry, Components } from "../interface.js";

export default async (components: Pick<Components, "stores" | "pinManager" | "libp2p" | "groups" | "blockstore">) => {
	const put = async (groupData: Uint8Array, path: string, encodedEntry: EncodedEntry) => {
		const group = CID.decode(groupData);
		const entry = decodeEntry(encodedEntry);

		await components.stores.get("pin-references").put(new Key(Path.join(entry.cid.toString(), group.toString(), path)), encodeAny(encodedEntry) );
		await components.pinManager.pinLocal(entry.cid);

		logger.uploads(`[+] ${path}`);

		const paths = [
			Path.join(path, "ROOT"),
			Path.join(path, components.libp2p.peerId.toString(), entry.sequence?.toString() ?? "0")
		];

		//await Promise.all(paths.map(path => components.groups.addTo(group, { ...entry, path })));

		for (const path of paths) {
			//await components.stores.get("cache").put(new Key(Path.join(group.toString(), path)), entry.cid.bytes );
			console.log("ADDING", path, entry);
			await components.groups.addTo(group, { ...entry, path });
		}
	};

	const om = new OperationManager(components.stores.get("upload-operations"), {
		put,

		delete: async (groupData: Uint8Array, path: string) => {
			const block = new Uint8Array([]);
			const multihash = await sha256.digest(block);
			const cid = CID.createV1(raw.code, multihash);

			await components.blockstore.put(cid, block);

			const entry = encodeEntry({
				cid,
				author: components.libp2p.peerId.toCID(),
				encrypted: false,
				links: [],
				blocks: 1,
				size: 0,
				timestamp: Date.now(),
				priority: 100,
				sequence: 0
			});

			await put(groupData, path, entry);
		}
	});

	await om.start();

	return om;
};
