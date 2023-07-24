import { NamespaceDatastore } from "./namespace-datastore.js";
import { Datastore, Key } from "interface-datastore";

export class Datastores {
	private readonly root: Datastore;
	private readonly stores = new Map<string, Datastore>();

	constructor (root: Datastore) {
		this.root = root;
	}

	get (name: string): Datastore {
		const cached = this.stores.get("name");

		if (cached != null) {
			return cached;
		}

		const store = new NamespaceDatastore(this.root, new Key(name));

		this.stores.set(name, store);

		return store;
	}
}
