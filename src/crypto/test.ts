import crypto from "crypto";
import fs from "fs";
import { toString as uint8ArrayToString, fromString as uint8ArrayFromString } from "uint8arrays";

const hkdf = (key: Uint8Array, index: number): Promise<Uint8Array> => new Promise((resolve, reject) => {
	crypto.hkdf("sha512", key, new Uint8Array([index]), new Uint8Array(), 4096, (err, derivedKey) => {
		if (err) {
			reject(err);
			return;
		}

		resolve(new Uint8Array(derivedKey));
	});
});

const createHmac = async (key: Uint8Array, path: string): Promise<Uint8Array> => {
	const stream = fs.createReadStream(path, { highWaterMark: 16 * 1024 });

	const hmac = crypto.createHmac("sha256", key);

	for await (const chunk of stream) {
		hmac.update(chunk);
	}

	return hmac.digest();
};

const key = uint8ArrayFromString("test-key");

const encryptKey = await hkdf(key, 0);
const hmacKey = await hkdf(key, 1);

console.log(encryptKey);
console.log(hmacKey);

const hmac = await createHmac(hmacKey, "/home/saul/Projects/distributed-backup/LICENSE");

const iv = hmac.slice(0, 16);

console.log(iv);
