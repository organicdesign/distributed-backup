import crypto from "crypto";
import type { KeyManager } from "./key-manager/index.js";
import type { Startable } from "@libp2p/interfaces/startable";

interface Components {
	keyManager: KeyManager
}

interface EncryptionParams {
	salt: Uint8Array
	iv: Uint8Array
}

export class Cipher implements Startable {
	private readonly keyManager: KeyManager;
	private started: boolean = false;

	constructor (components: Components) {
		this.keyManager = components.keyManager;
	}

	isStarted (): boolean {
		return this.started;
	}

	async start (): Promise<void> {
		if (this.started) {
			return;
		}

		this.started = true;
	}

	async stop (): Promise<void> {
		this.started = false;
	}

	async generate (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<EncryptionParams> {
		const hmac = await this.generateHmac(data);
		const iv = hmac.subarray(0, 16);
		const salt = hmac.subarray(16, 32);

		return { iv, salt };
	}

	async * encrypt (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, params: EncryptionParams) {
		const key = await this.deriveKey(params.salt);
		const cipher = crypto.createCipheriv("aes-256-cbc", key, params.iv, { encoding: "binary" });

		for await (const chunk of data) {
			yield cipher.update(chunk);
		}

		const last = cipher.final();

		if (last.length !== 0) {
			yield last;
		}
	}

	private async deriveKey (salt: Uint8Array): Promise<Uint8Array> {
		return await new Promise((resolve, reject) => {
			crypto.hkdf(
				"sha256",
				this.keyManager.getAesKey(),
				salt,
				new Uint8Array(),
				32,
				(err, derivedKey) => {
					if (err) {
						reject(err);
						return;
					}

					resolve(new Uint8Array(derivedKey));
				}
			);
		})
	}

	private async generateHmac (data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>) {
		const max: number | null = null;
		const hmac = crypto.createHmac("sha256", this.keyManager.getHmacKey());
		let len = 0;

		for await (const chunk of data) {
			if (max != null && len + chunk.length > max) {
				const diff = len + chunk.length - max;

				hmac.update(chunk.slice(0, diff));
				break;
			}

			hmac.update(chunk);

			len += chunk.length;

			if (max != null && len >= max) {
				break;
			}
		}

		return hmac.digest();
	}
}

export const createCipher = async (components: Components): Promise<Cipher> => {
	const cipher = new Cipher(components);

	await cipher.start();

	return cipher;
};
