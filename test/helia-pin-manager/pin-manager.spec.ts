import { describe, it, before, after, afterEach } from "node:test";
import assert from "assert/strict";
import { createHelia } from "helia";
import { CID } from "multiformats/cid";
import createDatabase from "../../src/helia-pin-manager/sequelize.js";
import { PinManager, type Components } from "../../src/helia-pin-manager/pin-manager.js";
import { addBlocks } from "../utils/blocks.js";

describe("pin manager", () => {
	let components: Components;
	let pm: PinManager;

	const data: {
		pins: { cid: CID, state: "COMPLETED", size: number, depth: number }[],
		blocks: { cid: CID, size: number, depth: number }[]
	} = {
		pins: [],
		blocks: []
	};

	before(async () => {
		const [helia, database] = await Promise.all([
			createHelia(),
			createDatabase()
		]);

		components = {
			helia,
			...database
		};

		pm = new PinManager(components);

		const rb = await addBlocks(helia);
		const blocks = rb.map(b => ({ ...b, state: "COMPLETED" as const, depth: 1, size: b.block.length }));

		data.blocks = blocks
		data.pins = blocks
	});

	after(async () => {
		await Promise.all([
			components.helia.stop(),
			components.sequelize.close()
		]);
	});

	afterEach(async () => {
		await Promise.all([
			components.blocks.destroy({ where: {} }),
			components.pins.destroy({ where: {} }),
			components.downloads.destroy({ where: {} })
		]);
	});

	it("constructs", () => {
		new PinManager(components);
	});

	it("all returns all the pins", async () => {
		await components.pins.bulkCreate(data.pins);

		const pins = await pm.all();

		for (const pin of pins) {

			assert(data.pins.find(p => p.cid.equals(pin.cid)));
		}
	});

	describe("unpin", () => {
		it("destorys the pin row", async () => {
			await components.pins.bulkCreate(data.pins);

			for (const pin of data.pins) {
				await pm.unpin(pin.cid);

				const p = await components.pins.findOne({ where: { cid: pin.cid.toString() } });

				assert(p == null);
			}
		});

		it("destorys all linked blocks", async () => {
			const pin = data.pins[0];

			await components.pins.create(pin);
			await components.blocks.bulkCreate(data.blocks.map(b => ({ ...b, pinnedBy: pin.cid })));
			await pm.unpin(pin.cid);

			const blocks = await components.blocks.findAll({ where: {} });

			assert.equal(blocks.length, 0);
		});

		it("destorys all linked downloads", async () => {
			const pin = data.pins[0];

			await components.pins.create(pin);
			await components.downloads.bulkCreate(data.blocks.map(b => ({ ...b, pinnedBy: pin.cid })));
			await pm.unpin(pin.cid);

			const downloads = await components.downloads.findAll({ where: {} });

			assert.equal(downloads.length, 0);
		});

		it("unpins it from helia", async () => {
			const pin = data.pins[0];

			await components.helia.pins.add(pin.cid);
			await components.pins.create(pin);
			await pm.unpin(pin.cid);

			const isPinned = await components.helia.pins.isPinned(pin.cid);

			assert(isPinned === false);
		});
	});
});
