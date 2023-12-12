import { PinManager as HeliaPinManager, type Components } from "../helia-pin-manager/pin-manager.js";
import { Key, type Datastore } from "interface-datastore";
import type { CID } from "multiformats/cid";

const DEFAULT_TAG = "DEFAULT";

export class PinManager extends HeliaPinManager {
	private readonly datastore: Datastore;

	constructor (components: Components & { datastore: Datastore }) {
		super(components);

		this.datastore = components.datastore;
	}

	async pin (cid: CID, tag?: string): Promise<void> {
		const key = new Key(`${cid.toString()}/${tag ?? DEFAULT_TAG}`);

		await this.datastore.put(key, new Uint8Array([]));
		await super.pin(cid);
	}

	async pinLocal (cid: CID, tag?: string): Promise<void> {
		const key = new Key(`${cid.toString()}/${tag ?? DEFAULT_TAG}`);

		await this.datastore.put(key, new Uint8Array([]));
		await super.pinLocal(cid);
	}

	async unpin (cid: CID, tag?: string): Promise<void> {
		const key = new Key(`${cid.toString()}/${tag ?? DEFAULT_TAG}`);

		await this.datastore.delete(key);

		for await (const _ of this.datastore.queryKeys({ prefix: `/${cid.toString()}` })) {
			// If we have another reference then just stop.
			return;
		}

		await super.unpin(cid);
	}
}
