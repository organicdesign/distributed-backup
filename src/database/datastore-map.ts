import { Key } from "interface-datastore";
import type { Pair } from "../interface.js";
import type { Datastore } from "interface-datastore";

export abstract class DatastoreMap <S extends {}> {
	private readonly datastore: Datastore;
	private readonly cache = new Map<string, S>();

	constructor (datastore: Datastore) {
		this.datastore = datastore;
	}

	abstract encode (data: S): Uint8Array;
	abstract decode (data: Uint8Array): S;

	async start () {
		for await (const pair of this.datastore.query({})) {
			const key = pair.key.toString();
			const value = this.decode(pair.value);

			this.cache.set(key, value);
		}
	}

	async set (key: string, value: S): Promise<void> {
		this.cache.set(key, value);
		await this.datastore.put(new Key(key), this.encode(value));
	}

	async delete (key: string): Promise<void> {
		this.cache.delete(key);
		await this.datastore.delete(new Key(key));
	}

	get (key: string): S | undefined {
		return this.cache.get(key);
	}

	has (key: string): boolean {
		return this.cache.has(key);
	}

	* all (): Generator<Pair<string, S>> {
		for (const [key, value] of this.cache) {
			yield { key, value };
		}
	}
}
