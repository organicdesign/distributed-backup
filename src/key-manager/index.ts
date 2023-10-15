import { keyToAes, importKeyFile, keyToPeerId } from "./utils.js";
import type { BIP32Interface } from "bip32";
import type { PeerId } from "@libp2p/interface-peer-id";

export class KeyManager {
	private readonly key: BIP32Interface;

	constructor (key: BIP32Interface) {
		this.key = key;
	}

	async getPeerId (): Promise<PeerId> {
		return await keyToPeerId(this.key);
	}

	getAesKey (): Uint8Array {
		return keyToAes(this.key);
	}
}

export const createKeyManager = async (path: string): Promise<KeyManager> => {
	const key = await importKeyFile(path);

	return new KeyManager(key);
}
