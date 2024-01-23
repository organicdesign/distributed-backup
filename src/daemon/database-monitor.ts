import Path from "path";
import { sha256 } from "multiformats/hashes/sha2";
import { compare as uint8ArrayCompare } from "uint8arrays/compare";
import { type Datastore, Key } from "interface-datastore";
import type { CID } from "multiformats/cid";

export class DatabaseMonitor {
	private readonly datastore: Datastore;

	constructor ({ datastore }: { datastore: Datastore }) {
		this.datastore = datastore;
	}

	async add (group: CID, path: string, data: Uint8Array): Promise<void> {
		const digest = await sha256.digest(data);

		await this.datastore.put(new Key(Path.join(group.toString(), path)), digest.bytes);
	}

	/**
	 * Check for the existance of an item and optionally check the data hasn't changed.
	 */
	async check (group: CID, path: string, data?: Uint8Array): Promise<boolean> {
		try {
			const oldData = await this.datastore.get(new Key(Path.join(group.toString(), path)));

			if (data == null) {
				return true;
			}

			const oldDigest = await sha256.digest(oldData);
			const digest = await sha256.digest(data);

			return uint8ArrayCompare(digest.bytes, oldDigest.bytes) === 0;
		} catch (error) {
			return false;
		}
	}
}
