import { describe, it, before, after, afterEach } from "node:test";
import assert from "assert/strict";
import { createHelia } from "helia";
import { CID } from "multiformats/cid";
import createDatabase from "../../src/helia-pin-manager/sequelize.js";
import { PinManager, type Components } from "../../src/helia-pin-manager/pin-manager.js";

describe("pin manager", () => {
	const cid = CID.parse("QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm").toV1();
	let components: Components;
	let pm: PinManager;

	const data = {
		pins: [
			{ cid, state: ("COMPLETED" as const), size: 0, depth: 1 }
		],
		blocks: [
			{ cid, size: 0, depth: 1 }
		]
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

			await pm.unpin(cid);

			const blocks = await components.blocks.findAll({ where: {} });

			assert(blocks.length === 0);
		});

		it("destorys all linked downloads", async () => {
			const pin = data.pins[0];

			await components.pins.create(pin);
			await components.downloads.bulkCreate(data.blocks.map(b => ({ ...b, pinnedBy: pin.cid })));

			await pm.unpin(cid);

			const downloads = await components.downloads.findAll({ where: {} });

			assert(downloads.length === 0);
		});
	});
});
