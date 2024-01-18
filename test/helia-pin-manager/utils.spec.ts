import assert from "assert/strict";
import all from "it-all";
import { createHelia, Helia } from "helia";
import { CID } from "multiformats/cid";
import { addPinRef, addBlockRef } from "../../src/helia-pin-manager/utils.js";

const cid = CID.parse("QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm").toV1();
let helia: Helia;

beforeEach(async () => {
	helia = await createHelia();
});

afterEach(async () => {
	await helia.stop();
});

describe("addPinRef", () => {
	it("it is listed in helia's pins", async () => {
		await addPinRef(helia, cid);

		const pins = await all(helia.pins.ls());

		assert.equal(pins.length, 1);

		for await (const pin of pins) {
			assert(pin.cid.equals(cid));
		}
	});
});

describe("addBlockRef", () => {
	it("it shows as pinned in helia", async () => {
		await addBlockRef(helia, cid, cid);

		const isPinned = await helia.pins.isPinned(cid);

		assert.equal(isPinned, true);
	});
});
