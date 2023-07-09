import Path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

export const srcPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), "..");

export const deriveKey = (
	key: Uint8Array,
	index: number,
	options: Partial<{ digest: string, size: number }> = {}
): Promise<Uint8Array> => new Promise((resolve, reject) => {
	crypto.hkdf(
		options.digest ?? "sha256",
		key,
		new Uint8Array([index]),
		new Uint8Array(),
		options.size ?? 32,
		(err, derivedKey) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(new Uint8Array(derivedKey));
		}
	);
});

export const createHmac = async (
	key: Uint8Array,
	data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
	options: Partial<{ digest: string, max: number }> = {}
): Promise<Uint8Array> => {
	const hmac = crypto.createHmac(options.digest ?? "sha256", key);
	let len = 0;

	for await (const chunk of data) {
		if (options.max != null && len + chunk.length > options.max) {
			const diff = len + chunk.length - options.max;

			hmac.update(chunk.slice(0, diff));
			break;
		}

		hmac.update(chunk);

		len += chunk.length;

		if (options.max != null && len >= options.max) {
			break;
		}
	}

	return hmac.digest();
};

export const deriveEncryptionParams = async (
	key: Uint8Array,
	data: Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
	options: Partial<{ digest: string, size: number, max: number }> = {}
) => {
	const [ encryptionKey, hmacKey ] = await Promise.all([
		deriveKey(key, 0, options),
		deriveKey(key, 1, options)
	]);

	const hmac = await createHmac(hmacKey, data, options);
	const iv = hmac.slice(0, 16);

	return { iv, key: encryptionKey };
};
