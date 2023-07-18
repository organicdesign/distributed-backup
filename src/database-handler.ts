import { Database, Welo, Address, Keyvalue } from "../../welo/dist/src/index.js";
import { CID } from "multiformats/cid";
import { decode } from "@ipld/dag-cbor";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import type { CMS } from "@libp2p/cms"

type KeyvalueDB = Omit<Database, "store"> & { store: Keyvalue }

export default class DatabaseHandler {
	private readonly welo: Welo;
	private readonly cms: CMS;
	private readonly peers = new Map<string, Uint8Array>();
	private database: KeyvalueDB | null = null;

	constructor (welo: Welo, cms: CMS) {
		this.welo = welo;
		this.cms = cms;
	}

	get address (): Address | undefined {
		return this.database?.address;
	}

	async create (peers?: Uint8Array[]) {
		this.peers.clear();
		this.addPeersToList([...(peers ?? []), this.welo.identity.id]);

		this.database = await this.createDatabase();
	}

	async connect (address: Address) {
		const manifest = await this.welo.fetch(address);

		console.log(manifest);

		await this.database?.close();

		this.database = await this.welo.open(manifest) as unknown as KeyvalueDB;
	}

	async add (cid: CID, path: string) {
		if (this.database == null) {
			throw new Error("not connected to a database");
		}

		const encryptedPath = await this.cms.encrypt("database", uint8ArrayFromString(path))

		const op = this.database.store.creators.put(cid.toString(), { cid: cid.bytes, path: encryptedPath });

		await this.database.replica.write(op);
	}

	async delete (cid: CID) {
		if (this.database == null) {
			throw new Error("not connected to a database");
		}

		const op = this.database.store.creators.del(cid.toString());

		await this.database.replica.write(op);
	}

	async replace (cid: CID) {
		const { path: encryptedPath } = await this.get(cid) as { path: Uint8Array };
		const path = uint8ArrayToString(await this.cms.decrypt(encryptedPath));

		await this.add(cid, path);
		await this.delete(cid);
	}

	async addPeers (peers: Uint8Array[]) {
		this.addPeersToList(peers);

		const database = await this.createDatabase();

		if (this.database == null) {
			this.database = database;
			return;
		}

		await this.migrate(this.database, database);
	}

	async query () {
		if (this.database == null) {
			throw new Error("database is not open");
		}

		const index = await this.database.store.latest();
		const data = new Map<string, unknown>();

		for await (const { key, value } of index.query({})) {
			const decoded = decode(value) as Uint8Array;

			if (decoded === null) {
				continue;
			}

			data.set(key.name(), decoded);
		}

		return data;
	}

	async get (cid: CID) {
		if (this.database == null) {
			throw new Error("database is not open");
		}

		const index = await this.database.store.latest();
		return await this.database.store.selectors.get(index)(cid.toString());
	}

	private addPeersToList (peers: Uint8Array[]) {
		for (const peer of peers) {
			this.peers.set(uint8ArrayToString(peer), peer);
		}
	}

	private async createDatabase () {
		const peers = this.peers.values();

		const manifest = await this.welo.determine({
			name: "backup",
			meta: { type: "group" },
			access: {
				protocol: "/hldb/access/static",
				config: { write: [...peers] }
			}
		});

		return await this.welo.open(manifest) as unknown as KeyvalueDB;
	}

	private async migrate (from: KeyvalueDB, to: KeyvalueDB) {
		const index = await from.store.latest();
		const promises: Promise<unknown>[] = []

		for await (const { key, value } of index.query({})) {
			const decoded = decode(value);

			if (decoded === null) {
				continue;
			}

			const op = (to.store as Keyvalue).creators.put(key.name(), decoded);

			promises.push(to.replica.write(op));
		}

		await Promise.all(promises);
	}
}
