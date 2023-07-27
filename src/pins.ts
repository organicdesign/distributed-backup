import { DatastoreMap } from "./datastore-map.js";
import { CID } from "multiformats/cid";
import { safePin, safeUnpin, decodeAny, encodeAny } from "./utils.js";
import type { Helia } from "@helia/interface";
import type { Datastore } from "interface-datastore";
import type { Pin } from "./interface.js";
import type { Startable } from "@libp2p/interfaces/startable";

class PinsStore extends DatastoreMap<Pin<Uint8Array>> {
	encode (data: Pin<Uint8Array>): Uint8Array {
		return encodeAny(data);
	}

	decode (data: Uint8Array): Pin<Uint8Array> {
		return decodeAny(data);
	}
}

export interface Components {
	helia: Helia
	datastore: Datastore
}

// Pins are identified with the tuples [CID, group]
export class Pins implements Startable {
	private readonly helia: Helia;
	private readonly pinsStore: PinsStore;
	private started = false;

	constructor (components: Components) {
		this.helia = components.helia;
		this.pinsStore = new PinsStore(components.datastore);
	}

	isStarted (): boolean {
		return this.started;
	}

	async start () {
		if (this.started) {
			return;
		}

		await this.pinsStore.start();

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

	async stop () {
		this.started = false;
	}

	async add (cid: CID, group: CID) {
		const existing = this.pinsStore.get(cid.toString());

		await safePin(this.helia, cid);

		if (existing != null) {
			existing.groups.push(group.bytes);
			await this.pinsStore.set(cid.toString(), existing);
			return;
		}

		await this.pinsStore.set(cid.toString(), this.toRaw({
			cid: cid,
			groups: [group]
		}));
	}

	// Remove a pin.
	async rm (cid: CID, group: CID) {
		const raw = this.pinsStore.get(cid.toString());

		if (raw == null) {
			await safeUnpin(this.helia, cid);

			return;
		}

		const existing = this.fromRaw(raw);

		existing.groups = existing.groups.filter(g => g.equals(group));

		if (existing.groups.length === 0) {
			await safeUnpin(this.helia, cid);
			await this.pinsStore.delete(cid.toString());
		} else {
			await this.pinsStore.set(cid.toString(), this.toRaw(existing));
		}
	}

	private toRaw (pin: Pin): Pin<Uint8Array> {
		return {
			cid: pin.cid.bytes,
			groups: pin.groups.map(g => g.bytes)
		};
	}

	private fromRaw (pin: Pin<Uint8Array>): Pin {
		return {
			cid: CID.decode(pin.cid),
			groups: pin.groups.map(CID.decode)
		};
	}
}

export const createPins = async (components: Components) => {
	const pins = new Pins(components);

	await pins.start();

	return pins;
};
