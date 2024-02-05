import Path from "path";
import { Key } from "interface-datastore";
// @ts-ignore
import { decodeCbor } from "welo/utils/block";
// @ts-ignore
import { Manifest } from "welo/manifest/index";
import { groups as logger } from "logger";
import type { CID } from "multiformats/cid";
import type { Welo } from "welo";
// @ts-ignore
import type { ManifestData } from "welo/manifest/interface";
import type { Datastore } from "interface-datastore";
import type { Startable } from "@libp2p/interfaces/startable";
import { type KeyvalueDB, type Pair, type Entry, EncodedEntry } from "./interface.js";

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
			const block = await decodeCbor<ManifestData>(pair.value);
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

		logger(`[join] ${manifest.address.cid.toString()}`);
	}

	async addTo (group: CID, path: string, entry: Entry) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		logger(`[+] ${Path.join(group.toString(), path)}`);

		const rawEntry: EncodedEntry = {
			cid: entry.cid.bytes,
			author: entry.author.bytes,
			encrypted: entry.encrypted,
			timestamp: entry.timestamp,
			sequence: entry.sequence,
			blocks: entry.blocks,
			size: entry.size,
			priority: entry.priority,
			revisionStrategy: entry.revisionStrategy
		};

		// Update global database.
		const op = database.store.creators.put(path, rawEntry);

		await database.replica.write(op);
	}

	async deleteFrom (group: CID, path: string) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		logger(`[-] ${Path.join(group.toString(), path)}`);

		const op = database.store.creators.del(path);

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
