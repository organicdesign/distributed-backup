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

	async remove (group: CID, path: string): Promise<void> {
		await this.datastore.delete(new Key(Path.join(group.toString(), path)));
	}

	/**
	 * Check for the existance of an item and optionally check the data hasn't changed.
	 */
	async check (group: CID, path: string, data?: Uint8Array): Promise<boolean> {
		try {
			const key = new Key(Path.join(group.toString(), path));
			const oldDigest = await this.datastore.get(key);

			if (data == null) {
				return true;
			}

			const digest = await sha256.digest(data);

			return uint8ArrayCompare(digest.bytes, oldDigest) === 0;
		} catch (error) {
			return false;
		}
	}
}
