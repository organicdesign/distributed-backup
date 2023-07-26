import { DatastoreMap } from "./database/datastore-map.js";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { CID } from "multiformats/cid";
import { Datastore } from "interface-datastore";
import * as dagCbor from "@ipld/dag-cbor";
import type { AbortOptions } from "interface-store";
import type { KeyvalueDB, GroupEntry, Reference } from "./interface.js";

class RefStore extends DatastoreMap<Reference> {
	encode (data: Reference): Uint8Array {
		return uint8ArrayFromString(JSON.stringify(data));
	}

	decode (data: Uint8Array): Reference {
		return JSON.parse(uint8ArrayToString(data));
	}
}

export class Group {
	private readonly database: KeyvalueDB;
	private readonly refStore: RefStore;

	constructor (components: { datastore: Datastore, database: KeyvalueDB }) {
		this.database = components.database;
		this.refStore = new RefStore(components.datastore);
	}

	async start () {
		await this.refStore.start();
		//this.database.events.addEventListener("update", (evt) => {});
	}

	async sync (options?: AbortOptions) {
		const index = await this.database.store.latest();

		for await (const pair of index.query({}, options)) {
			const entry = dagCbor.decode(pair.value) as GroupEntry;

			if (entry == null) {
				if (this.refStore.has(pair.key.baseNamespace())) {
					await this.refStore.delete(pair.key.baseNamespace());
				}
				continue;
			}

			if (this.refStore.has(pair.key.baseNamespace())) {
				continue;
			}

			await this.refStore.set(pair.key.baseNamespace(), {
				...entry,
				group: this.database.address.toString(),
				status: "accepted"
			})
		}
	}

	async updateTs (cid: CID, group: string) {
		const ref = this.refStore.get(`${group}/${cid.toString()}`);

		if (ref == null) {
			console.warn("cannot update entry that does not exist");
			return;
		}

		if (!ref.local) {
			throw new Error("reference is not an upload");
		}

		ref.local.updatedAt = Date.now();

		await this.refStore.set(`${group}/${cid.toString()}`, ref);
	}

	async add (ref: Reference) {
		const cid = CID.decode(ref.cid);

		// Update local storage.
		await this.refStore.set(cid.toString(), ref);

		// Update global database.
		const op = this.database.store.creators.put(cid.toString(), {
			cid: ref.cid,
			addedBy: ref.addedBy,
			encrypted: ref.encrypted,
			next: ref.next,
			prev: ref.prev,
			meta: ref.meta
		});

		await this.database.replica.write(op);
	}

	* all (): Generator<Reference> {
		for (const { value } of this.refStore.all()) {
			yield value;
		}
	}
}
