import Path from "path";
import { Key, type Datastore } from "interface-datastore";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import { CID } from "multiformats/cid";
import all from "it-all";
import { compare as uint8ArrayCompare } from "uint8arrays/compare";
import { encodeAny, decodeAny, decodeEntry } from "./utils.js";
import * as logger from "./logger.js";
import { EncodedEntry, EncodedPinInfo, type PinInfo } from "./interface.js";
import type { PinManager as HeliaPinManager } from "helia-pin-manager";

// Get the hash data from raw data.
const hashEntry = async (data: Uint8Array) => {
	const digest = await sha256.digest(data);

	return digest.bytes;
};

// Decode an entry from raw data.
const decodeEntryFromRaw = (data: Uint8Array) => {
	const encodedEntry = EncodedEntry.parse(dagCbor.decode(data));

	if (encodedEntry == null) {
		return null;
	}

	const entry = decodeEntry(encodedEntry);

	return entry;
};

// Generate the key to store data under.
const makeKey = (group: CID, path: string) => new Key(Path.join(group.toString(), path));

// This class is responsible for keeping track of what is pinned uner what group/path and automatically unpinning if there are no more references to a pin.
export class PinManager {
	private readonly datastore: Datastore;
	private readonly pinManager: HeliaPinManager;

	constructor (components: { datastore: Datastore, pinManager: HeliaPinManager }) {
		this.datastore = components.datastore;
		this.pinManager = components.pinManager;
	}

	async has (group: CID, path: string, cid: CID): Promise<boolean> {
		const pinInfo = await this.getPinInfo(group, path);

		if (pinInfo == null) {
			return false;
		}

		return pinInfo.cid.equals(cid);
	}

	// Process an entry.
	async process (group: CID, path: string, rawEntry: Uint8Array, local?: boolean): Promise<void> {
		const hash = await hashEntry(rawEntry);
		const entry = decodeEntryFromRaw(rawEntry);

		if (entry == null) {
			await this.remove(group, path);
			return;
		}

		await this.removeIfOld(group, path, entry.cid);
		await this.putPinInfo(group, path, { hash, cid: entry.cid });

		logger.references(`[+] ${makeKey(group, path).toString()}`);

		if (local === true) {
			await this.pinManager.pinLocal(entry.cid);
		} else {
			await this.pinManager.pin(entry.cid);
		}
	}

	// Validate an entry against the last seen data.
	async validate (group: CID, path: string, rawEntry: Uint8Array): Promise<boolean> {
		const pinInfo = await this.getPinInfo(group, path);

		if (pinInfo == null) {
			return decodeEntryFromRaw(rawEntry) == null;
		}

		if (pinInfo.hash == null) {
			return false;
		}

		const hash = await hashEntry(rawEntry);

		return uint8ArrayCompare(pinInfo.hash, hash) === 0;
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
		const key = makeKey(group, path);
		const pinInfo = await this.getPinInfo(group, path);

		if (pinInfo == null) {
			return;
		}

		const keys = await all(this.getByPin(pinInfo.cid));

		if (keys.length <= 1) {
			await this.pinManager.unpin(pinInfo.cid);
		}

		logger.references(`[-] ${key.toString()}`);

		await this.datastore.delete(key);
	}

	private async getPinInfo (group: CID, path: string) {
		const key = makeKey(group, path);

		if (!await this.datastore.has(key)) {
			return null;
		}

		const data = await this.datastore.get(key);
		const pinInfo = EncodedPinInfo.parse(decodeAny(data));

		return { ...pinInfo, cid: CID.decode(pinInfo.cid) };
	}

	private async putPinInfo (group: CID, path: string, pinInfo: PinInfo) {
		const key = makeKey(group, path);
		const encoded = encodeAny<EncodedPinInfo>({ ...pinInfo, cid: pinInfo.cid.bytes });

		await this.datastore.put(key, encoded);
	}

	private async * getByPin (pin: CID) {
		yield * this.datastore.query({ filters: [ ({ value }) => {
			const pinInfo = EncodedPinInfo.parse(decodeAny(value));
			const cid = CID.decode(pinInfo.cid);

			return cid.equals(pin);
		} ] });
	}

	// Unpins the old key if it does not matched the pass cid.
	private async removeIfOld (group: CID, path: string, cid: CID) {
		const pinInfo = await this.getPinInfo(group, path);

		if (pinInfo?.cid.equals(cid) === false) {
			await this.remove(group, path);
		}
	}
}
