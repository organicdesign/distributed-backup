import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { CID } from "multiformats/cid";
import { Datastore, Key, Query } from "interface-datastore";
import * as dagCbor from "@ipld/dag-cbor";
import type { AbortOptions } from "interface-store";
import type { KeyvalueDB, LocalEntry, GroupEntry, CombinedEntry } from "./interface.js";

const encode = <T extends LocalEntry | GroupEntry>(data: T): Uint8Array => {
	return uint8ArrayFromString(JSON.stringify(data));
}

const decode = <T extends LocalEntry | GroupEntry>(data: Uint8Array): T => {
	return JSON.parse(uint8ArrayToString(data));
}

export class Group {
	private readonly datastore: Datastore;
	private readonly database: KeyvalueDB;
	private readonly localData = new Map<string, LocalEntry>();

	constructor (components: { datastore: Datastore, database: KeyvalueDB }) {
		this.datastore = components.datastore;
		this.database = components.database;
	}

	async start () {
		// Load data into memory from storage.
		for await (const pair of this.datastore.query({})) {
			const key = pair.key.toString();
			const value = decode<LocalEntry>(pair.value);

			this.localData.set(key, value);
		}
		//this.database.events.addEventListener("update", (evt) => {});
	}

	async sync () {

	}

	async add (entry: CombinedEntry) {
		const cid = CID.decode(entry.group.cid);

		// Update in-memory.
		this.localData.set(cid.toString(), entry.local);

		// Update local storage.
		await this.datastore.put(new Key(cid.toString()), encode(entry.local));

		// Update global database.
		const op = this.database.store.creators.put(cid.toString(), entry.group);

		await this.database.replica.write(op);
	}

	async * query (query: Query, options?: AbortOptions): AsyncGenerator<CombinedEntry> {
		const index = await this.database.store.latest();

		for await (const pair of index.query(query, options)) {
			const groupEntry = dagCbor.decode(pair.value) as GroupEntry;

			if (groupEntry == null) {
				continue;
			}

			const localEntry = this.localData.get(pair.key.baseNamespace())

			if (localEntry == null) {
				console.error("missing localdata - should sync...")
				continue;
			}

			yield { local: localEntry, group: groupEntry };
		}
	}
}
