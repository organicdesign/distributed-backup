import { Key } from "interface-datastore";
import { Welo } from "../../welo/dist/src/index.js";
import { Blocks } from "welo/dist/src/blocks/index.js";
import { Manifest } from "welo/dist/src/manifest/index.js";
import type { CID } from "multiformats/cid";
import type { ManifestData } from "welo/dist/src/manifest/interface.js";
import type { Datastore } from "interface-datastore";
import type { Startable } from "@libp2p/interfaces/startable";
import type { KeyvalueDB, Pair, Entry } from "./interface.js";

export interface Components {
	datastore: Datastore
	welo: Welo
}

export class Groups implements Startable {
	private readonly welo: Welo;
	private readonly datastore: Datastore;
	private readonly groups = new Map<string, KeyvalueDB>();
	private started = false;

	constructor (components: Components) {
		this.welo = components.welo;
		this.datastore = components.datastore;
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

		this.groups.set(manifest.address.cid.toString(), database);

		await this.datastore.put(new Key(database.address.cid.toString()), database.manifest.block.bytes);
	}

	async addTo (group: CID, entry: Entry) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		const rawEntry: Entry<Uint8Array> = {
			cid: entry.cid.bytes,
			addedBy: entry.addedBy,
			encrypted: entry.encrypted,
			meta: entry.meta ?? {},
			timestamp: entry.timestamp
		};

		if (entry.next) {
			rawEntry.next = entry.next.bytes;
		}

		if (entry.prev) {
			rawEntry.prev = entry.prev.bytes;
		}

		// Update global database.
		const op = database.store.creators.put(entry.cid.toString(), rawEntry);

		await database.replica.write(op);
	}

	async deleteFrom (cid: CID, group: CID) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		const op = database.store.creators.del(cid.toString());

		await database.replica.write(op);
	}

	get (group: CID) {
		return this.groups.get(group.toString());
	}

	* all (): Iterable<Pair<string, KeyvalueDB>> {
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
