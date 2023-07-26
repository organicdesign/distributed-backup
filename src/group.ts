import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import type { RefStore } from "./ref-store.js";
import type { KeyvalueDB, Entry, Reference } from "./interface.js";
import type { AbortOptions } from "interface-store";

export class Group {
	private readonly database: KeyvalueDB;
	private readonly refStore: RefStore;

	constructor (components: { refStore: RefStore, database: KeyvalueDB }) {
		this.database = components.database;
		this.refStore = components.refStore;
	}

	async start () {
		await this.refStore.start();
		//this.database.events.addEventListener("update", (evt) => {});
	}

	async sync (options?: AbortOptions) {
		const index = await this.database.store.latest();

		for await (const pair of index.query({}, options)) {
			const entry = dagCbor.decode(pair.value) as Entry;

			const pref = {
				cid: CID.parse(pair.key.baseNamespace()),
				group: this.database.address.cid
			};

			if (entry == null) {
				if (await this.refStore.has(pref)) {
					await this.refStore.delete(pref);
				}

				continue;
			}

			if (await this.refStore.has(pref)) {
				continue;
			}

			await this.refStore.set({
				...pref,
				...entry,
				group: this.database.address.cid,
				status: "accepted"
			});
		}
	}

	async updateTs (pref: { cid: CID, group: CID}) {
		const ref = await this.refStore.get(pref);

		if (ref == null) {
			console.warn("cannot update entry that does not exist");
			return;
		}

		if (!ref.local) {
			throw new Error("reference is not an upload");
		}

		ref.local.updatedAt = Date.now();

		await this.refStore.set(ref);
	}

	async add (ref: Omit<Reference, "group">) {
		// Update local storage.
		await this.refStore.set({ ...ref, group: this.database.address.cid });

		const entry: Entry<Uint8Array> = {
			cid: ref.cid.bytes,
			addedBy: ref.addedBy,
			encrypted: ref.encrypted,
			meta: ref.meta ?? {},
			timestamp: ref.timestamp
		};

		if (ref.next) {
			entry.next = ref.next.bytes;
		}

		if (ref.prev) {
			entry.prev = ref.prev.bytes;
		}

		// Update global database.
		const op = this.database.store.creators.put(ref.cid.toString(), entry);

		await this.database.replica.write(op);
	}

	async rm (cid: CID) {
		const pref = {
			cid,
			group: this.database.address.cid
		};

		if (await this.refStore.has(pref)) {
			await this.refStore.delete(pref);
		}

		const op = this.database.store.creators.del(cid.toString());

		await this.database.replica.write(op);
	}

	async * all (): AsyncGenerator<Reference> {
		yield* this.refStore.all();
	}
}
