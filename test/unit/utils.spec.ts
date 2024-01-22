import assert from "assert/strict";
import { createHelia, type Helia  } from "helia";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { MEMORY_MAGIC } from "../../src/interface.js";
import { isMemory, safePin, safeUnpin, safeReplace } from "../../src/utils.js";

describe("isMemory", () => {
	it("returns true if the memory magic is passed", () => {
		assert(isMemory(MEMORY_MAGIC));
	});

	it("returns false for any other value than the memory magic", () => {
		const values = [
			"/my/path",
			"my-directory",
			":memory",
			"memory",
			"memory:",
			":memory:/my-dir"
		];

		for (const value of values) {
			assert(!isMemory(value));
		}
	});
});

describe("safe pinning", () => {
	const blockData = [
		new Uint8Array([]),
		new Uint8Array([0, 1, 2, 3]),
		new Uint8Array([255, 255, 255, 255])
	];

	let cids: CID[];
	let helia: Helia;

	beforeEach(async () => {
		helia = await createHelia();
		cids = [];

		for (const data of blockData) {
			const digest = await sha256.digest(data);
			const cid = CID.createV1(raw.code, digest);

			await helia.blockstore.put(cid, data);

			cids.push(cid);
		}
	});

	afterEach(async () => {
		await helia.stop();
	});

	it("safePin pins cids", async () => {
		await Promise.all(cids.map(cid => safePin(helia, cid)));

		for (const cid of cids) {
			assert(await helia.pins.isPinned(cid));
		}
	});

	it("safePin does not throw if the cid is already pinned", async () => {
		await Promise.all(cids.map(cid => helia.pins.add(cid)));
		await Promise.all(cids.map(cid => safePin(helia, cid)));

		for (const cid of cids) {
			assert(await helia.pins.isPinned(cid));
		}
	});

	it("safeUnpin unpins a cid", async () => {
		await Promise.all(cids.map(cid => helia.pins.add(cid)));
		await Promise.all(cids.map(cid => safeUnpin(helia, cid)));

		for (const cid of cids) {
			assert(!await helia.pins.isPinned(cid));
		}
	});

	it("safeUnpin does not throw an error if the cid is not pinned", async () => {
		await Promise.all(cids.map(cid => safeUnpin(helia, cid)));

		for (const cid of cids) {
			assert(!await helia.pins.isPinned(cid));
		}
	});

	it("safeReplace replaces a cid with another", async () => {
		const rCid = cids.pop();

		await Promise.all(cids.map(cid => helia.pins.add(cid)));

		assert(rCid);

		await Promise.all(cids.map(cid => safeReplace(helia, cid, rCid)));

		for (const cid of cids) {
			assert(!await helia.pins.isPinned(cid));
		}

		assert(await helia.pins.isPinned(rCid));
	});

	it("safeReplace does not throw an error if the replaced cid is not pinned", async () => {
		const rCid = cids.pop();

		assert(rCid);

		await Promise.all(cids.map(cid => safeReplace(helia, cid, rCid)));

		for (const cid of cids) {
			assert(!await helia.pins.isPinned(cid));
		}

		assert(await helia.pins.isPinned(rCid));
	});
});
