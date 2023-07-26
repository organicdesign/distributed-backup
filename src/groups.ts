import { Group } from "./group.js";
import { Key } from "interface-datastore";
import { Welo } from "../../welo/dist/src/index.js";
import { Blocks } from "welo/dist/src/blocks/index.js";
import { Manifest } from "welo/dist/src/manifest/index.js";
import type { RefStore } from "./ref-store.js";
import type { ManifestData } from "welo/dist/src/manifest/interface.js";
import type { Datastore } from "interface-datastore";
import type { Startable } from "@libp2p/interfaces/startable";
import type { KeyvalueDB, Pair } from "./interface.js";

export interface Components {
	datastore: Datastore
	welo: Welo
	refStore: RefStore
}

export class Groups implements Startable {
	private readonly welo: Welo;
	private readonly datastore: Datastore;
	private readonly refStore: RefStore;
	private readonly groups = new Map<string, Group>();
	private started = false;

	constructor (components: Components) {
		this.welo = components.welo;
		this.datastore = components.datastore;
		this.refStore = components.refStore;
	}

	isStarted (): boolean {
		return this.started;
	}

	async start () {
		if (this.started) {
			return;
		}

		for await (const pair of this.datastore.query({})) {
			const block = await Blocks.decode<ManifestData>({ bytes: pair.value })
			const manifest = Manifest.asManifest({ block });

			if (manifest == null) {
				continue;
			}

			await this.add(manifest);
		}

		this.started = true;
	}

	async stop () {
		this.groups.clear();
		this.started = false;
	}

	async add (manifest: Manifest) {
		const database = await this.welo.open(manifest) as KeyvalueDB;
		const group = new Group({ refStore: this.refStore, database });

		this.groups.set(manifest.name, group);

		await this.datastore.put(new Key(database.address.toString()), database.manifest.block.bytes);
	}

	get (address: string) {
		return this.groups.get(address);
	}

	* all (): Iterable<Pair<string, Group>> {
		for (const [key, value] of this.groups.entries()) {
			yield { key, value };
		}
	}
}

export const createGroups = async (components: Components): Promise<Groups> => {
	const groups = new Groups(components);

	await groups.start();

	return groups;
}
