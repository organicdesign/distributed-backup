import { describe, it, before } from "node:test";
import assert from "assert/strict";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import {
	nameToPath,
	decodeKey,
	encodeKey,
	bip32,
	keyToPeerId,
	generateKeyData,
	parseKeyData
} from "../../src/key-manager/utils.js";
import data from "./data.js";

describe("nameToPath", { concurrency: 4 }, () => {
	let hardenedPaths: string[];
	let unhardenedPaths: string[];
	let allPaths: string[];

	before(async () => {
		hardenedPaths = await Promise.all(data.map(d => nameToPath(d.name)));
		unhardenedPaths = await Promise.all(data.map(d => nameToPath(d.name, false)));
		allPaths = [...hardenedPaths, ...unhardenedPaths];
	});

	it("is determnistic", async () => {
		const paths1 = await Promise.all(data.map(d => nameToPath(d.name)));
		const paths2 = await Promise.all(data.map(d => nameToPath(d.name)));

		assert.deepEqual(paths1, paths2);
	});

	it("is unique", () => {
		const paths = [...allPaths];

		while (paths.length > 0) {
			const item = paths.pop();

			assert(item);
			assert(!paths.includes(item));
		}
	});

	it("returns a path starting with 'm/'", () => {
		for (const path of allPaths) {
			assert.equal(path.substring(0, 2), "m/");
		}
	});

	it("has '/' delimited numbers", () => {
		for (const path of allPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num);
				assert(!Number.isNaN(num));
				assert(num > 0);
			}
		}
	});

	it("non-hardened paths are less than 0x80000000", () => {
		for (const path of unhardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num < 0x80000000);
			}
		}
	});

	it("hardened paths are greater than 0x80000000", () => {
		for (const path of hardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num > 0x80000000);
			}
		}
	});
});

describe("decodeKey", () => {
	it("decodes valid keys", () => {
		for (const { key } of data) {
			assert(decodeKey(key));
		}
	});
});

describe("encodeKey", { concurrency: 4 }, () => {
	it("encodes valid keys", () => {
		for (const { key } of data) {
			assert.equal(encodeKey(decodeKey(key)), key);
		}
	});

	it("throws an error if the private data is missing", () => {
		for (const { publicKey: k } of data) {
			const [publicKey, chainCode] = k.split("-").map(s => uint8ArrayFromString(s, "base58btc"));
			const key = bip32.fromPublicKey(Buffer.from(publicKey), Buffer.from(chainCode));

			assert.rejects(async () => encodeKey(key));
		}
	});
});

describe("keyToPeerId", () => {
	it("converts keys to peerIds", async () => {
		await Promise.all(data.map(d => keyToPeerId(decodeKey(d.key))));
	});
});

describe("generateKeyData", () => {
	it("generates key data", async () => {
		await Promise.all(data.map(async ({ mnemonic, name, key, psk }) => {
			const keyData = await generateKeyData(mnemonic, name);

			assert.equal(keyData.key, key);
			assert.equal(keyData.psk, psk);
		}));
	});
});

describe("parseKeyData", () => {
	it("parses the key data", async () => {
		await Promise.all(data.map(async ({ key, psk }) => {
			const keyData = parseKeyData({ key, psk });

			// This should be tested a bit better...
			assert(keyData);
			assert(keyData.key);
			assert(keyData.psk);
		}));
	});
});
