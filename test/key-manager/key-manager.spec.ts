import { describe, it, before } from "node:test";
import assert from "assert/strict";
import { generateKeyData, parseKeyData } from "../../src/key-manager/utils.js";
import { KeyManager } from "../../src/key-manager/index.js";
import rawData from "./data.js";
import type { KeyData } from "../../src/interface.js";

let data: (typeof rawData[0] & { keyManager: KeyManager } & { keyData: KeyData })[];

describe("key manager", () => {
	before(async () => {
		data = await Promise.all(rawData.map(async r => {
			const encodedKeyData = await generateKeyData(r.mnemonic, r.name);
			const keyData = parseKeyData(encodedKeyData);
			const keyManager = new KeyManager(keyData);

			return { ...r, keyManager, keyData };
		}));
	});

	it("returns the psk", () => {
		for (const d of data) {
			assert.deepEqual(d.keyData.psk, d.keyManager.getPskKey());
		}
	});

	it("returns the aes key", () => {
		for (const d of data) {
			const key = d.keyData.key.deriveHardened(2);

			assert.deepEqual(key.privateKey, d.keyManager.getAesKey());
		}
	});

	it("returns the hmac key", () => {
		for (const d of data) {
			const key = d.keyData.key.deriveHardened(3);

			assert.deepEqual(key.privateKey, d.keyManager.getHmacKey());
		}
	});
});
