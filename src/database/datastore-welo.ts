import { decode } from "@ipld/dag-cbor";
import { BaseDatastore, Errors } from "datastore-core";
import type { Key, Pair, Query, KeyQuery } from "interface-datastore";
import type { AwaitIterable, AbortOptions } from "interface-store";
import type { Database, Keyvalue } from "welo";

export interface KeyvalueDB extends Database {
	store: Keyvalue
}

export class DatastoreWelo extends BaseDatastore {
	protected readonly database: KeyvalueDB;

	constructor (database: KeyvalueDB) {
		super();
		this.database = database;
	}

	async delete (key: Key): Promise<void> {
		const op = this.database.store.creators.del(key.toString());

		await this.database.replica.write(op);
	}

	async has (key: Key): Promise<boolean> {
		const index = await this.database.store.latest();
		const result = await this.database.store.selectors.get(index)(key.toString());

		return result != null;
	}

	async get (key: Key): Promise<Uint8Array> {
		const index = await this.database.store.latest();
		const value = await this.database.store.selectors.get(index)(key.toString());

		if (value == null || !(value instanceof Uint8Array)) {
			throw Errors.notFoundError();
		}

		return value as Uint8Array;
	}

	async put (key: Key, value: Uint8Array): Promise<Key> {
		const op = this.database.store.creators.put(key.toString(), value);

		await this.database.replica.write(op);

		return key;
	}

	async * _all (query: Query, options?: AbortOptions): AwaitIterable<Pair> {
		const index = await this.database.store.latest();

		for await (const { key, value } of index.query(query, options)) {
			const decoded = decode(value) as Uint8Array;

			if (decoded == null) {
				continue;
			}

			yield { key, value: decoded };
		}
	}

	async * _allKeys (query: KeyQuery, options?: AbortOptions): AwaitIterable<Key> {
		const index = await this.database.store.latest();

		for await (const key of index.queryKeys(query, options)) {
			yield key;
		}
	}
}
