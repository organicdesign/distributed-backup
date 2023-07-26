import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { DatastoreMap } from "./datastore-map.js";
import type { Datastore } from "interface-datastore";
import type { Reference } from "./interface.js";

export class RefStore extends DatastoreMap<Reference> {
	encode (data: Reference): Uint8Array {
		return uint8ArrayFromString(JSON.stringify(data));
	}

	decode (data: Uint8Array): Reference {
		return JSON.parse(uint8ArrayToString(data));
	}
}

export const createRefStore = async (datastore: Datastore): Promise<RefStore> => {
	const refStore = new RefStore(datastore);

	await refStore.start();

	return refStore;
};
