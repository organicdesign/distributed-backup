import { Key } from "interface-datastore";
import type { Pair } from "../interface.js";
import type { AbortOptions } from "interface-store";
import type { Datastore } from "interface-datastore";

export abstract class DatastoreMap <S extends {}> {
	private readonly datastore: Datastore;

	constructor (datastore: Datastore) {
		this.datastore = datastore;
	}

	abstract encode (data: S): Uint8Array;
	abstract decode (data: Uint8Array): S;

	async set (key: string, data: S): Promise<void> {
		await this.datastore.put(new Key(key), this.encode(data));
	}

	async get (key: string): Promise<S> {
		const data = await this.datastore.get(new Key(key));

		return this.decode(data);
	}

	async * all (options?: AbortOptions): AsyncGenerator<Pair<string, S>> {
		for await (const pair of this.datastore.query({}, options)) {
			yield { key: pair.key.toString(), value: this.decode(pair.value) };
		}
	}
}
