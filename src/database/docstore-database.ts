import { decode } from "@ipld/dag-cbor";
import type { Address } from "../../../welo/dist/src/index.js";
import type { KeyvalueDB, Pair } from "../interface.js";

export class DocstoreDatabase<Schema = unknown> {
	protected readonly database: KeyvalueDB;

	constructor (database: KeyvalueDB) {
		this.database = database;
	}

	get address (): Address {
		return this.database.address;
	}

	async get (key: string): Promise<Schema> {
		const index = await this.database.store.latest();

		return await this.database.store.selectors.get(index)(key) as Schema;
	}

	async add (key: string, value: Schema): Promise<void> {
		const op = this.database.store.creators.put(key, value);

		await this.database.replica.write(op);
	}

	async delete (key: string): Promise<void> {
		const op = this.database.store.creators.del(key);

		await this.database.replica.write(op);
	}

	async move (oldKey: string, newKey: string): Promise<void> {
		const data = await this.get(oldKey);

		await this.add(newKey, data);
		await this.delete(oldKey);
	}

	async * query (): AsyncGenerator<Pair<string, Schema>> {
		const index = await this.database.store.latest();

		for await (const { key, value } of index.query({})) {
			const decoded = decode(value) as Schema;

			if (decoded === null) {
				continue;
			}

			yield { key: key.name(), value: decoded };
		}
	}
}
