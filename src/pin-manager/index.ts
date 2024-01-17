import type { PinManager as HeliaPinManager } from "../helia-pin-manager/pin-manager.js";
import * as logger from "../logger.js";
import { Key, type Datastore } from "interface-datastore";
import { CID } from "multiformats/cid";

export class PinManager {
	private readonly datastore: Datastore;
	private readonly pinManager: HeliaPinManager;

	constructor (components: { datastore: Datastore, pinManager: HeliaPinManager }) {
		this.datastore = components.datastore;
		this.pinManager = components.pinManager;
	}

	async has (group: CID, path: string, cid: CID): Promise<boolean> {
		const key = new Key(`/${group.toString()}/${path}/${cid.toString()}`);

		return await this.datastore.has(key);
	}

	async pin (group: CID, path: string, cid: CID): Promise<void> {
		await this.updateKey(group, path, cid);
		await this.pinManager.pin(cid);
	}

	async pinLocal (group: CID, path: string, cid: CID): Promise<void> {
		await this.updateKey(group, path, cid);
		await this.pinManager.pinLocal(cid);
	}

	async * getActive () {
		for (const pin of await this.pinManager.getActiveDownloads()) {
			yield * this.getByPin(pin);
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

	private async * getByPin (pin: CID) {
		const itr = this.datastore.queryKeys({ filters: [ key => {
			const cidStr = key.list().pop();

			if (cidStr == null) {
				logger.warn("Invalid key: ", key);
				return false;
			}

			const cid = CID.parse(cidStr);

			return cid.equals(pin);
		} ] });

		for await (const key of itr) {
			const parts = key.list();

			yield {
				group: CID.parse(parts[0]),
				cid: CID.parse(parts[parts.length - 1]),
				path: `${parts.slice(1, parts.length - 1).join("/")}`
			};
		}
	}

	private async updateKey (group: CID, path: string, cid: CID) {
		const key = new Key(`/${group.toString()}/${path}/${cid.toString()}`);

		// Prune old keys...
		await this.prune(key);

		// Check if this has been handled...
		if (await this.datastore.has(key)) {
			// Already handled this one.
			return;
		}

		// Add the new reference.
		await this.datastore.put(key, new Uint8Array());
	}

	private async prune (key: Key): Promise<void> {
		for await (const otherKey of this.datastore.queryKeys({ prefix: key.parent().toString() })) {
			if (otherKey.toString() === key.toString()) {
				// Ignore the one we are querying.
				continue;
			}

			const cidStr = otherKey.list().pop();

			if (cidStr == null) {
				logger.warn("Invalid key: ", otherKey);
				continue;
			}

			const cid = CID.parse(cidStr);

			await this.pinManager.unpin(cid);
			await this.datastore.delete(otherKey);
		}
	}
}
