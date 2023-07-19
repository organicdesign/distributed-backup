import { Key } from "interface-datastore";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import type { LocalEntry, Pair } from "../interface.js";
import type { AbortOptions } from "interface-store";
import type { Datastore } from "interface-datastore";

const encode = (data: LocalEntry): Uint8Array => uint8ArrayFromString(JSON.stringify(data));
const decode = (data: Uint8Array): LocalEntry => JSON.parse(uint8ArrayToString(data));

export class LocalDatabase {
	private readonly datastore: Datastore;

	constructor (datastore: Datastore) {
		this.datastore = datastore;
	}

	async add (key: string, data: LocalEntry): Promise<void> {
		await this.datastore.put(new Key(key), encode(data));
	}

	async get (key: string): Promise<LocalEntry> {
		const data = await this.datastore.get(new Key(key));

		return decode(data);
	}

	async * all (options?: AbortOptions): AsyncGenerator<Pair<string, LocalEntry>> {
		for await (const pair of this.datastore.query({}, options)) {
			yield { key: pair.key.toString(), value: decode(pair.value) };
		}
	}
}
