import Path from "path";
import { Key, type Datastore } from "interface-datastore";
import { CID } from "multiformats/cid";
import all from "it-all";
import type { PinManager as HeliaPinManager } from "../helia-pin-manager/pin-manager.js";

// This class is responsible for keeping track of what is pinned uner what group/path and automatically unpinning if there are no more references to a pin.
export class PinManager {
	private readonly datastore: Datastore;
	private readonly pinManager: HeliaPinManager;

	constructor (components: { datastore: Datastore, pinManager: HeliaPinManager }) {
		this.datastore = components.datastore;
		this.pinManager = components.pinManager;
	}

	async has (group: CID, path: string, cid: CID): Promise<boolean> {
		const key = new Key(Path.join(group.toString(), path));

		if (!await this.datastore.has(key)) {
			return false;
		}

		const savedCid = CID.decode(await this.datastore.get(key));

		return savedCid.equals(cid);
	}

	async pin (group: CID, path: string, cid: CID): Promise<void> {
		const key = new Key(Path.join(group.toString(), path));

		await this.removeIfOld(group, path, cid);
		await this.datastore.put(key, cid.bytes);
		await this.pinManager.pin(cid);
	}

	async pinLocal (group: CID, path: string, cid: CID): Promise<void> {
		const key = new Key(Path.join(group.toString(), path));

		await this.removeIfOld(group, path, cid);
		await this.datastore.put(key, cid.bytes);
		await this.pinManager.pinLocal(cid);
	}

	async * getActive () {
		for (const pin of await this.pinManager.getActiveDownloads()) {
			for await (const { key } of this.getByPin(pin)) {
				const parts = key.list();

				yield {
					group: CID.parse(parts[0]),
					cid: pin,
					path: `${parts.slice(1).join("/")}`
				};
			}
		}
	}

	download (pin: CID, options?: { limit: number }) {
		return this.pinManager.downloadSync(pin, options);
	}

	async getState (cid: CID) {
		return await this.pinManager.getState(cid);
	}

	async getSize (cid: CID) {
		return await this.pinManager.getSize(cid);
	}

	async getBlockCount (cid: CID) {
		return await this.pinManager.getBlockCount(cid);
	}

	async remove (group: CID, path: string) {
		const key = new Key(Path.join(group.toString(), path));

		if (!await this.datastore.has(key)) {
			return;
		}

		const cid = CID.decode(await this.datastore.get(key));

		const keys = await all(this.getByPin(cid));

		if (keys.length <= 1) {
			await this.pinManager.unpin(cid);
		}
	}

	private async * getByPin (pin: CID) {
		yield * this.datastore.query({ filters: [ ({ value }) => {
			const cid = CID.decode(value);

			return cid.equals(pin);
		} ] });
	}

	// Unpins the old key if it does not matched the pass cid.
	private async removeIfOld (group: CID, path: string, cid: CID) {
		const key = new Key(Path.join(group.toString(), path));

		// Prune old keys...
		if (await this.datastore.has(key)) {
			const savedCid = CID.decode(await this.datastore.get(key));

			if (!savedCid.equals(cid)) {
				await this.remove(group, path);
			}
		}
	}
}
