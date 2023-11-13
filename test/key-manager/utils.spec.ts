import { describe, it, before } from "node:test";
import assert from "assert/strict";
import { nameToPath } from "../../src/key-manager/utils.js";

const data = {
	serverNames: ["test", "test2", "server", "a long name with spaces", `1234567890-=!@#$%^&*()_+"':;,./<?>`]
};

describe("nameToPath", () => {
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

	it("is unique", async () => {
		const paths = [...allPaths];

		while (paths.length > 0) {
			const item = paths.pop();

			assert(item);
			assert(!paths.includes(item));
		}
	});

	it("returns a path starting with 'm/'", async () => {
		for (const path of allPaths) {
			assert.equal(path.substring(0, 2), "m/");
		}
	});

	it("has '/' delimited numbers", async () => {
		for (const path of allPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num);
				assert(!Number.isNaN(num));
				assert(num > 0);
			}
		}
	});

	it("non-hardened paths are less than 0x80000000", async () => {
		for (const path of unhardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num < 0x80000000);
			}
		}
	});

	it("hardened paths are greater than 0x80000000", async () => {
		for (const path of hardenedPaths) {
			const nums = path.slice(2).split("/").map(s => Number.parseInt(s));

			for (const num of nums) {
				assert(num > 0x80000000);
			}
		}
	});
});
