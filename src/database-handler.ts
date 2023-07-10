import { Database, Welo, Address, Keyvalue } from "welo";
import { CID } from "multiformats/cid";
import { decode } from "@ipld/dag-cbor";
import { toString as uint8ArrayToString } from "uint8arrays";

type KeyvalueDB = Omit<Database, "store"> & { store: Keyvalue };

export default class DatabaseHandler {
	private readonly welo: Welo;
	private readonly peers = new Map<string, Uint8Array>();
	private database: KeyvalueDB | null = null;

	constructor (welo: Welo) {
		this.welo = welo;
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

		this.database = await this.welo.open(manifest) as unknown as KeyvalueDB;
	}

	async add (cid: CID) {
		if (this.database == null) {
			throw new Error("not connected to a database");
		}

		const op = this.database.store.creators.put(cid.toString(), { cid: cid.bytes });

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
		await this.add(cid);
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

	private addPeersToList (peers: Uint8Array[]) {
		for (const peer of peers) {
			this.peers.set(uint8ArrayToString(peer), peer);
		}
	}

	private async createDatabase () {
		const peers = this.peers.values();

		const manifest = await this.welo.determine({
			name: "backup",
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
