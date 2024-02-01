import assert from "assert/strict";
import { CID } from "multiformats/cid";
import createDatabase from "../../../src/helia-pin-manager/sequelize.js";

const cid = CID.parse("QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm").toV1();

describe("database", () => {
	it("sets the database up and shuts down", async () => {
		const { sequelize }  = await createDatabase();

		await sequelize.close();
	});
});

describe("blocks table", () => {
	const data = { cid, pinnedBy: cid, size: 0, depth: 1 };
	let database: Awaited<ReturnType<typeof createDatabase>>;

	beforeEach(async () => {
		database = await createDatabase();
	});

	afterEach(async () => {
		await database.sequelize.close();
	});

	it("can save a block to the table", async () => {
		const block = await database.blocks.create(data);

		assert.equal(block.dataValues.cid, data.cid.toString());
		assert.equal(block.dataValues.pinnedBy, data.pinnedBy.toString());
		assert.equal(block.dataValues.size, data.size);
		assert.equal(block.dataValues.depth, data.depth);
	});

	it ("can fetch a block from the table", async () => {
		await database.blocks.create(data);

		const block = await database.blocks.findOne({ where: { cid: data.cid.toString() } });

		assert(block);

		assert.equal(block.dataValues.cid, data.cid.toString());
		assert.equal(block.dataValues.pinnedBy, data.pinnedBy.toString());
		assert.equal(block.dataValues.size, data.size);
		assert.equal(block.dataValues.depth, data.depth);
	});
});

describe("pins table", () => {
	const data = { cid, state: ("COMPLETED" as const), size: 0, depth: 1 };
	let database: Awaited<ReturnType<typeof createDatabase>>;

	beforeEach(async () => {
		database = await createDatabase();
	});

	afterEach(async () => {
		await database.sequelize.close();
	});

	it("can save a pin to the table", async () => {
		const pin = await database.pins.create(data);

		assert.equal(pin.dataValues.cid, data.cid.toString());
		assert.equal(pin.dataValues.state, data.state);
		assert.equal(pin.dataValues.depth, data.depth);
	});

	it ("can fetch a pin from the table", async () => {
		await database.pins.create(data);

		const pin = await database.pins.findOne({ where: { cid: data.cid.toString() } });

		assert(pin);

		assert.equal(pin.dataValues.cid, data.cid.toString());
		assert.equal(pin.dataValues.state, data.state);
		assert.equal(pin.dataValues.depth, data.depth);
	});
});

describe("downloads table", () => {
	const data = { cid, pinnedBy: cid, size: 0, depth: 1 };
	let database: Awaited<ReturnType<typeof createDatabase>>;

	beforeEach(async () => {
		database = await createDatabase();
	});

	afterEach(async () => {
		await database.sequelize.close();
	});

	it("can save a download to the table", async () => {
		const pin = await database.downloads.create(data);

		assert.equal(pin.dataValues.cid, data.cid.toString());
		assert.equal(pin.dataValues.pinnedBy, data.pinnedBy.toString());
		assert.equal(pin.dataValues.depth, data.depth);
	});

	it ("can fetch a download from the table", async () => {
		await database.downloads.create(data);

		const pin = await database.downloads.findOne({ where: { cid: data.cid.toString() } });

		assert(pin);

		assert.equal(pin.dataValues.cid, data.cid.toString());
		assert.equal(pin.dataValues.pinnedBy, data.pinnedBy.toString());
		assert.equal(pin.dataValues.depth, data.depth);
	});
});
