import { DatastoreWelo } from "./datastore-welo.js";
import { Key } from "interface-datastore";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import type { KeyvalueDB, GroupEntry, Pair } from "../interface.js";
import type { AbortOptions } from "interface-store";

const encode = (data: GroupEntry): Uint8Array => uint8ArrayFromString(JSON.stringify(data));
const decode = (data: Uint8Array): GroupEntry => JSON.parse(uint8ArrayToString(data));

export class GroupDatabase {
	private readonly datastore: DatastoreWelo;

	constructor (database: KeyvalueDB) {
		this.datastore = new DatastoreWelo(database);
	}

	async add (key: string, data: GroupEntry): Promise<void> {
		await this.datastore.put(new Key(key), encode(data));
	}

	async get (key: string): Promise<GroupEntry> {
		const data = await this.datastore.get(new Key(key));

		return decode(data);
	}

	async * all (options?: AbortOptions): AsyncGenerator<Pair<string, GroupEntry>> {
		for await (const pair of this.datastore.query({}, options)) {
			yield { key: pair.key.toString(), value: decode(pair.value) };
		}
	}
}
