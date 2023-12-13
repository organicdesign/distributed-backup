import { PinManager as HeliaPinManager, type Components } from "../helia-pin-manager/pin-manager.js";
import { Key, type Datastore } from "interface-datastore";
import { CID } from "multiformats/cid";

const DEFAULT_TAG = "DEFAULT";

// CID <-> TAG

export class PinManager extends HeliaPinManager {
	private readonly datastore: Datastore;

	constructor (components: Components & { datastore: Datastore }) {
		super(components);

		this.datastore = components.datastore;
	}

	async pin (cid: CID, tag?: string): Promise<void> {
		await this.updateKey(cid, tag ?? DEFAULT_TAG);
		await super.pin(cid);
	}

	async pinLocal (cid: CID, tag?: string): Promise<void> {
		await this.updateKey(cid, tag ?? DEFAULT_TAG);
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

	private async updateKey (cid: CID, tag: string) {
		const oldCid = await this.getCidFromTag(tag);

		if (oldCid == null) {
			await this.unpin(cid);
		}

		const key = new Key(`${cid.toString()}/${tag}`);

		await this.datastore.put(key, new Uint8Array([]));
	}

	async getCidFromTag (tag: string): Promise<CID | null> {
		const itr = this.datastore.queryKeys({ filters: [
			k => {
				const parts = k.toString().split("/");
				const keyTag = parts.slice(2).join("/");

				return keyTag === tag;
			}
		]});

		for await (const key of itr) {
			// We only expect each path to return only one CID.
			return CID.parse(key.toString().split("/")[1]);
		}

		return null;
	}
}
