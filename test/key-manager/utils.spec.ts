import { describe, it, before } from "node:test";
import assert from "assert/strict";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import { nameToPath, decodeKey, encodeKey, bip32 } from "../../src/key-manager/utils.js";

const data = {
	serverNames: ["test", "test2", "server", "a long name with spaces", `1234567890-=!@#$%^&*()_+"':;,./<?>`],
	keys: [
		"6i663MycvhbETEo8iHiWoqSnXQeTRhRHuQn4jBNe4p6X-H2qTHRx8wLDwD6ZABhNnyTL7zaeUit3M5xgEQUy5P7hk",
		"2HcBxgCC61DRncxR3jGjEYtR7uGdzHAULaJWg9gZhNRJ-E6QpxpehZNoUgkdzQ8EJq59KGhFAXoeCP4jjLPmppKfN",
		"83ni5cuix98PVpNjWwN6pypVC5Eg4o9os1XNcFAYAyiL-8WKQFeZSfANEAEPQsZ3gnnnqpuXLiNcpaWN6ZnDGeenh"
	],
	publicKeys: [
		"n3XryUCG5Yj1RBNpbREtVTQNbUF9StahRtTFoNjWvVmT-H2qTHRx8wLDwD6ZABhNnyTL7zaeUit3M5xgEQUy5P7hk",
		"234tMFeqYNFswB1dbHAxjd7kC7YLFg7fWHa1ktS6mQaTg-E6QpxpehZNoUgkdzQ8EJq59KGhFAXoeCP4jjLPmppKfN",
		"onpJc2CHexoncYAdcLUjpxZAFjkPCY3w9GcF1Qw3iWpQ-8WKQFeZSfANEAEPQsZ3gnnnqpuXLiNcpaWN6ZnDGeenh"
	]
};

describe("nameToPath", { concurrency: 4 }, () => {
	let hardenedPaths: string[];
	let unhardenedPaths: string[];
	let allPaths: string[];

	before(async () => {
		hardenedPaths = await Promise.all(data.serverNames.map(name => nameToPath(name)));
		unhardenedPaths = await Promise.all(data.serverNames.map(name => nameToPath(name, false)));
		allPaths = [...hardenedPaths, ...unhardenedPaths];
	});

	it("is determnistic", async () => {
		const paths1 = await Promise.all(data.serverNames.map(name => nameToPath(name)));
		const paths2 = await Promise.all(data.serverNames.map(name => nameToPath(name)));

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
		for (const key of data.keys) {
			assert(decodeKey(key));
		}
	});
});

describe("encodeKey", { concurrency: 4 }, () => {
	it("encodes valid keys", () => {
		for (const key of data.keys) {
			assert.equal(encodeKey(decodeKey(key)), key);
		}
	});

	it("throws an error if the private data is missing", () => {
		for (const k of data.publicKeys) {
			const [publicKey, chainCode] = k.split("-").map(s => uint8ArrayFromString(s, "base58btc"));
			const key = bip32.fromPublicKey(Buffer.from(publicKey), Buffer.from(chainCode));

			assert.rejects(async () => encodeKey(key));
		}
	});
});
