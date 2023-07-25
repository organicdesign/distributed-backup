import { DatastoreMap } from "./database/datastore-map.js";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { CID } from "multiformats/cid";
import { safePin, safeUnpin } from "./utils.js";
import type { Helia } from "@helia/interface";
import type { Datastore } from "interface-datastore";

interface Pin {
	cid: Uint8Array,
	groups: string[]
}

class PinsStore extends DatastoreMap<Pin> {
	encode (data: Pin): Uint8Array {
		return uint8ArrayFromString(JSON.stringify(data));
	}

	decode (data: Uint8Array): Pin {
		return JSON.parse(uint8ArrayToString(data));
	}
}

// Pins are identified with the tuples [CID, group]
export class Pins {
	private readonly helia: Helia;
	private readonly pinsStore: PinsStore;

	constructor (components: { helia: Helia, datastore: Datastore }) {
		this.helia = components.helia;
		this.pinsStore = new PinsStore(components.datastore);
	}

	async start () {
		// Ensure every pin we have saved is actually pinned by helia.
		const promises: Promise<void>[] = [];

		for (const item of this.pinsStore.all()) {
			promises.push((async () => {
				const cid = CID.decode(item.value.cid);

				await safePin(this.helia, cid);
			})());
		}

		await Promise.all(promises);
	}

	async add (cid: CID, group: string) {
		const existing = this.pinsStore.get(cid.toString());

		await safePin(this.helia, cid);

		if (existing != null) {
			existing.groups.push(group);
			await this.pinsStore.set(cid.toString(), existing);
			return;
		}

		await this.pinsStore.set(cid.toString(), {
			cid: cid.bytes,
			groups: [group]
		});
	}

	// Remove a pin.
	async rm (cid: CID, group: string) {
		const existing = this.pinsStore.get(cid.toString());

		if (existing == null) {
			await safeUnpin(this.helia, cid);

			return;
		}

		existing.groups = existing.groups.filter(g => g === group);

		if (existing.groups.length === 0) {
			await safeUnpin(this.helia, cid);
			await this.pinsStore.delete(cid.toString());
		} else {
			await this.pinsStore.set(cid.toString(), existing);
		}
	}
}
