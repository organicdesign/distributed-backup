import Path from "path";
import * as dagCbor from "@ipld/dag-cbor";
import { Key } from "interface-datastore";
import { sha256 } from "multiformats/hashes/sha2";
import { compare as uint8ArrayCompare } from "uint8arrays/compare";
import * as logger from "../logger.js";
import { decodeAny } from "../utils.js";
import { type Components, EncodedEntry, DATA_KEY } from "../interface.js";

export const groupsToRefs = async (components: Components) => {
	for (const { value: database } of components.groups.all()) {
		//logger.validate("syncing group: %s", database.address.cid.toString());
		const index = await database.store.latest();

		for await (const pair of index.query({ prefix: Path.join("/", DATA_KEY)})) {
			const group = database.address.cid;
			const path = pair.key.toString();

			if (decodeAny(pair.value) == null) {
				logger.warn("deletion detected but is not implemented");
				continue;
			}

			const digest = await sha256.digest(pair.value);

			// All we really want to do here is check for dirty entries.
			try {
				const store = components.stores.get("parsed-entries");
				const value = await store.get(new Key(path));

				if (uint8ArrayCompare(digest.bytes, value) === 0) {
					// We have already parsed this entry.
					continue;
				}
			} catch (error) {
				// Ignore error...
			}

			logger.entry("syncing update:", path)

			const entry = EncodedEntry.parse(dagCbor.decode(pair.value));
			//const cid = CID.decode(entry.cid);
			//logger.validate("syncing item: %s", CID.parse(pair.key.baseNamespace()).toString());

			// Check if we have a reference...
			/*const pinState = await components.pinManager.getState(cid);

			if (!["NOTFOUND", "DESTORYED"].includes(pinState)) {
				// We already have it.
				continue;
			}*/

			//Path.join(VERSION_KEY, path, components.libp2p.peerId.toString(), entry.sequence.toString())

			await components.sync.add("put", [group.bytes, path, entry, digest.bytes]);
		}
	}
};
