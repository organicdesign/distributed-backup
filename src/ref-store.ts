import { encodeAny, decodeAny } from "./utils.js";
import { CID } from "multiformats/cid";
import { Datastore, Key } from "interface-datastore";
import type { Startable } from "@libp2p/interfaces/startable";
import type { Reference } from "./interface.js";

// Partial reference, some items need only cid & group.
type PRef = Pick<Reference, "cid" | "group">

export class RefStore implements Startable {
	private readonly datastore: Datastore;
	private started = false;

	constructor (datastore: Datastore) {
		this.datastore = datastore;
	}

	isStarted () {
		return this.started;
	}

	async start () {
		this.started = true;
	}

	async stop () {
		this.started = false;
	}

	async set (reference: Reference): Promise<void> {
		const key = this.toKey(reference);
		const value = encodeAny(this.toRaw(reference));

		await this.datastore.put(key, value);
	}

	async get ({ cid, group }: PRef): Promise<Reference> {
		const key = this.toKey({ cid, group });
		const raw = await this.datastore.get(key);
		const value = this.fromRaw(decodeAny(raw));

		return value;
	}

	async delete (reference: PRef): Promise<void> {
		const key = this.toKey(reference);

		await this.datastore.delete(key);
	}

	async has ({ cid, group }: PRef): Promise<boolean> {
		const key = this.toKey({ cid, group });
		const has = await this.datastore.has(key);

		return has;
	}

	async * all (): AsyncGenerator<Reference> {
		for await (const { value } of this.datastore.query({})) {
			yield this.fromRaw(decodeAny(value));
		}
	}

	async * allByGroup (group: CID): AsyncGenerator<Reference> {
		for await (const { value } of this.datastore.query({ prefix: group.toString() })) {
			yield this.fromRaw(decodeAny(value));
		}
	}

	private toKey ({ cid, group }: PRef): Key {
		return new Key(`${group.toString()}/${cid.toString()}`);
	}

	private toRaw (reference: Reference): Reference<Uint8Array> {
		return {
			...reference,
			cid: reference.cid.bytes,
			group: reference.group.bytes,
			prev: reference.prev?.bytes,
			next: reference.next?.bytes
		};
	}

	private fromRaw (reference: Reference<Uint8Array>): Reference {
		return {
			...reference,
			cid: CID.decode(reference.cid),
			group: CID.decode(reference.group),
			prev: reference.next ? CID.decode(reference.next) : undefined,
			next: reference.next ? CID.decode(reference.next) : undefined
		};
	}
}

export const createRefStore = async (datastore: Datastore): Promise<RefStore> => {
	const refStore = new RefStore(datastore);

	await refStore.start();

	return refStore;
};
