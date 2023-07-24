import crypto from "crypto";
import { Datastore, Key } from "interface-datastore";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";
import { CMS } from "@libp2p/cms";
import type { Startable } from "@libp2p/interfaces/startable";
import type { Libp2p } from "@libp2p/interface-libp2p";

interface Options {
	name: string
}

interface Components {
	libp2p: Libp2p
	datastore: Datastore
	passphrase: string
}

interface EncryptionParams {
	salt: Uint8Array
	iv: Uint8Array
}

export class Cipher implements Startable {
	private readonly datastore: Datastore;
	private readonly libp2p: Libp2p;
	private readonly passphrase: string;
	private readonly options: Options;
	private readonly cms: CMS;
	private rootKey: Uint8Array | null = null;
	private hmacKey: Uint8Array | null = null;
	private started: boolean = false;

	constructor (components: Components, options: Partial<Options> = {}) {
		this.datastore = components.datastore;
		this.libp2p = components.libp2p;
		this.passphrase = components.passphrase;
		this.cms = new CMS(this.libp2p.keychain);

		this.options = {
			name: "backup",
			...options
		};
	}

	isStarted (): boolean {
		return this.started;
	}

	async start (): Promise<void> {
		if (this.started) {
			return;
		}

		await this.loadLibp2pKey();
		await this.loadRootKey();

		this.hmacKey = await this.deriveKey(new Uint8Array());

		this.started = true;
	}

	async stop (): Promise<void> {
		this.rootKey?.fill(0);
		this.hmacKey?.fill(0);

		this.rootKey = null;
		this.hmacKey = null;

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

	private async loadLibp2pKey () {
		const key = new Key("libp2p");

		try {
			const raw = await this.datastore.get(key);
			const pem = uint8ArrayToString(raw);

			await this.libp2p.keychain.importKey(this.options.name, pem, this.passphrase);
		} catch (error) {
			await this.libp2p.keychain.createKey(this.options.name, "RSA");

			const pem = await this.libp2p.keychain.exportKey(this.options.name, this.passphrase);
			const raw = uint8ArrayFromString(pem);

			await this.datastore.put(key, raw);
		}
	}

	private async loadRootKey () {
		const key = new Key("root");

		try {
			const encrypted = await this.datastore.get(key);

			this.rootKey = await this.cms.decrypt(encrypted);
		} catch (error) {
			this.rootKey = crypto.randomBytes(64);

			const encrypted = await this.cms.encrypt(this.options.name, this.rootKey);

			await this.datastore.put(key, encrypted)
		}
	}

	private async deriveKey (salt: Uint8Array): Promise<Uint8Array> {
		return await new Promise((resolve, reject) => {
			if (this.rootKey == null) {
				throw new Error("root key has not been loaded");
			}

			crypto.hkdf(
				"sha256",
				this.rootKey,
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
		if (this.hmacKey == null) {
			throw new Error("hmac key has not been derived");
		}

		const max: number | null = null;
		const hmac = crypto.createHmac("sha256", this.hmacKey);
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

export const createCipher = async (components: Components, options: Partial<Options> = {}): Promise<Cipher> => {
	const cipher = new Cipher(components, options);

	await cipher.start();

	return cipher;
};
