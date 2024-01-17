import { Key, type Datastore } from "interface-datastore";
import { CID } from "multiformats/cid";
import { encodeAny, decodeAny } from "./utils.js";
import { LocalEntryData } from "./interface.js";

export class EntryReferences {
	private readonly datastore: Datastore;

	constructor (components: { datastore: Datastore }) {
		this.datastore = components.datastore;
	}

	async set (group: CID, path: string, data: Partial<LocalEntryData>): Promise<void> {
		const key = new Key(`/${group.toString()}${path}`);

		await this.datastore.put(key, encodeAny(data));
	}

	async get (group: CID, path: string): Promise<Partial<LocalEntryData> | null> {
		const key = new Key(`/${group.toString()}${path}`);

		if (!(await this.datastore.has(key))) {
			return null;
		}

		const raw = await this.datastore.get(key);

		return LocalEntryData.parse(decodeAny(raw));
	}
}
