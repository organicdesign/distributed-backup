import { Key, type Datastore } from "interface-datastore";
import { CID } from "multiformats/cid";
import { encodeAny, decodeAny } from "./utils.js";

export class EntryReferences {
	private readonly datastore: Datastore;

	constructor (components: { datastore: Datastore }) {
		this.datastore = components.datastore;
	}

	async set (group: CID, path: string, data: { priority: number }): Promise<void> {
		const key = new Key(`/${group.toString()}${path}`);

		await this.datastore.put(key, encodeAny(data));
	}

	async get (group: CID, path: string): Promise<{ priority: number } | null> {
		const key = new Key(`/${group.toString()}${path}`);

		if (!(await this.datastore.has(key))) {
			return null;
		}

		const raw = await this.datastore.get(key);

		return decodeAny(raw);
	}
}
