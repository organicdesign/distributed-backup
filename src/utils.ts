import Path from "path";
import crypto from "crypto";
import fs from "fs";
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
		options.size ?? 1024,
		(err, derivedKey) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(new Uint8Array(derivedKey));
		}
	);
});

export const createHmac = async (key: Uint8Array, path: string, options: Partial<{ digest: string }> = {}): Promise<Uint8Array> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });

	const hmac = crypto.createHmac(options.digest ?? "sha256", key);

	for await (const chunk of stream) {
		hmac.update(chunk);
	}

	return hmac.digest();
};

export const deriveEncryptionParams = async (
	key: Uint8Array,
	path: string,
	options: Partial<{ digest: string, size: number }> = {}
) => {
	const [ encryptionKey, hmacKey ] = await Promise.all([
		deriveKey(key, 0, options),
		deriveKey(key, 1, options)
	]);

	const hmac = await createHmac(hmacKey, path, options);
	const iv = hmac.slice(0, 16);

	return { iv, key: encryptionKey };
};
