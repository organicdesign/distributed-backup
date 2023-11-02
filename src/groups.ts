import { Key } from "interface-datastore";
import { decodeCbor } from "../node_modules/welo/dist/src/utils/block.js";
import { Manifest } from "../node_modules/welo/dist/src/manifest/index.js";
import { groups as logger } from "./logger.js";
import type { CID } from "multiformats/cid";
import type { Welo } from "../../welo/dist/src/index.js";
import type { ManifestData } from "../node_modules/welo/dist/src/manifest/interface.js";
import type { Datastore } from "interface-datastore";
import type { Startable } from "@libp2p/interfaces/startable";
import type { KeyvalueDB, Pair, Entry, Link } from "./interface.js";

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
			const block = await decodeCbor<ManifestData>(pair.value)
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
		logger(`[join] ${manifest.address.cid.toString()}`);
		const database = await this.welo.open(manifest) as KeyvalueDB;

		this.groups.set(manifest.address.cid.toString(), database);

		await this.datastore.put(new Key(database.address.cid.toString()), database.manifest.block.bytes);
	}

	async addTo (group: CID, entry: Entry) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		logger(`[+] ${group.toString()}/${entry.cid.toString()}`);

		const rawEntry: Entry<Uint8Array> = {
			cid: entry.cid.bytes,
			author: entry.author,
			encrypted: entry.encrypted,
			meta: entry.meta ?? {},
			timestamp: entry.timestamp,
			blocks: entry.blocks,
			size: entry.size,
			links: entry.links.map(l => ({ ...l, cid: l.cid.bytes })),
			priority: entry.priority
		};

		// Update global database.
		const op = database.store.creators.put(entry.cid.toString(), rawEntry);

		await database.replica.write(op);
	}

	async addLinks (group: CID, cid: CID, links: Link[]) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		const index = await database.store.latest();
		const entry = await database.store.selectors.get(index)(cid.toString()) as Entry<Uint8Array> | undefined;

		if (entry == null) {
			throw new Error("no such item in group");
		}

		entry.links = [ ...entry.links, ...links.map(l => ({ ...l, cid: l.cid.bytes })) ];

		const op = database.store.creators.put(cid.toString(), entry);

		await database.replica.write(op);
	}

	async deleteFrom (cid: CID, group: CID) {
		const database = this.groups.get(group.toString());

		if (database == null) {
			throw new Error("not a part of group");
		}

		logger(`[-] ${group.toString()}/${cid.toString()}`);

		const op = database.store.creators.del(cid.toString());

		await database.replica.write(op);
	}

	async replace (group: CID, oldCid: CID, entry: Entry) {
		await this.addTo(group, entry);
		await this.deleteFrom(oldCid, group);
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
