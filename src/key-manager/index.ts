import { importKeyFile, keyToPeerId } from "./utils.js";
import type { BIP32Interface } from "bip32";
import type { PeerId } from "@libp2p/interface-peer-id";

enum keyIndicies {
	LIBP2P,
	AES,
	HMAC
};

export class KeyManager {
	private readonly key: BIP32Interface;

	constructor (key: BIP32Interface) {
		this.key = key;
	}

	async getPeerId (): Promise<PeerId> {
		const key = this.key.deriveHardened(keyIndicies.LIBP2P);

		return await keyToPeerId(key);
	}

	getAesKey (): Uint8Array {
		return this.derivePrivate(keyIndicies.AES);
	}

	getHmacKey (): Uint8Array {
		return this.derivePrivate(keyIndicies.HMAC);
	}

	private derivePrivate (index: number): Uint8Array {
		const key = this.key.deriveHardened(index);

		if (key.privateKey == null) {
			throw new Error("key is missing private data");
		}

		return key.privateKey;
	}
}

export const createKeyManager = async (path: string): Promise<KeyManager> => {
	const key = await importKeyFile(path);

	return new KeyManager(key);
};
