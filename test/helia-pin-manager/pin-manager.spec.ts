import assert from "assert/strict";
import EventEmitter from "events";
import all from "it-all";
import { createHelia } from "helia";
import { CID } from "multiformats/cid";
import createDatabase from "../../src/helia-pin-manager/sequelize.js";
import { PinManager, type Components } from "../../src/helia-pin-manager/pin-manager.js";
import { addBlocks } from "../utils/blocks.js";
import { createDag } from "../utils/dag.js";

const DAG_WIDTH = 2;
const DAG_DEPTH = 3;

EventEmitter.setMaxListeners(100);

describe("pin manager", () => {
	let components: Components;
	let pm: PinManager;
	let dag: CID[];

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

		dag = await createDag(components.helia, DAG_DEPTH, DAG_WIDTH);

		pm = new PinManager(components);

		const rb = await addBlocks(helia);
		const blocks = rb.map(b => ({ ...b, state: "COMPLETED" as const, depth: 1, size: b.block.length }));

		data.blocks = blocks;
		data.pins = blocks;
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

			await all(components.helia.pins.add(pin.cid));
			await components.pins.create(pin);
			await pm.unpin(pin.cid);

			const isPinned = await components.helia.pins.isPinned(pin.cid);

			assert(isPinned === false);
		});

		it("emits pins:removed event", async () => {
			const pin = data.pins[0];

			await all(components.helia.pins.add(pin.cid));

			const promise = new Promise<void>((resolve, reject) => {
				pm.events.addEventListener("pins:removed", () => {
					resolve();
				});

				setTimeout(reject, 3000);
			});

			await pm.unpin(pin.cid);

			await promise;
		});
	});

	describe("pinLocal", () => {
		it("adds the root as a pin", async () => {
			const root = dag[0];

			await pm.pinLocal(root);

			const pin = await components.pins.findOne({ where: { cid: root.toString() } });

			assert(pin);
			assert(pin.cid.equals(root));
		});

		it("adds all the items in the dag as blocks", async () => {
			const root = dag[0];

			await pm.pinLocal(root);

			const blocks = await components.blocks.findAll({ where: { pinnedBy: root.toString() } });

			assert.equal(blocks.length, Object.values(dag).length);

			for (const block of blocks) {
				assert(dag.find(b => b.equals(block.cid)));
			}
		});

		it("pins the root", async () => {
			const root = dag[0];

			await pm.pinLocal(root);

			const isPinned = await components.helia.pins.isPinned(root);

			assert(isPinned);
		});

		it("emits pins:added event", async () => {
			const pin = data.pins[0];

			await all(components.helia.pins.add(pin.cid));

			const promise = new Promise<void>((resolve, reject) => {
				pm.events.addEventListener("pins:added", () => {
					resolve();
				});

				setTimeout(reject, 3000);
			});

			await pm.pinLocal(pin.cid);

			await promise;
		});
	});

	describe("pin", () => {
		it("creates the pin row in a downloading state", async () => {
			const root = dag[0];

			await pm.pin(root);

			const pin = await components.pins.findOne({ where: { cid: root.toString() } });

			assert(pin);
			assert(pin.cid.equals(root));
			assert.equal(pin.state, "DOWNLOADING");
		});

		it("adds the root as a download", async () => {
			const root = dag[0];

			await pm.pin(root);

			const downloads = await components.downloads.findAll({ where: { pinnedBy: root.toString() } });

			assert.equal(downloads.length, 1);
			assert(downloads[0].cid.equals(root));
		});

		it("does nothing if the pin already exists", async () => {
			const root = dag[0];

			await components.pins.create({ cid: root, depth: 1, state: "COMPLETED" });
			await pm.pin(root);

			const downloads = await components.downloads.findAll({ where: { pinnedBy: root.toString() } });
			const pin = await components.pins.findOne({ where: { cid: root.toString() } });

			assert.equal(downloads.length, 0);
			assert(pin);
		});

		it("emits pins:adding event", async () => {
			const root = dag[0];
			const promise = new Promise<void>((resolve, reject) => {
				pm.events.addEventListener("pins:adding", () => {
					resolve();
				});

				setTimeout(reject, 3000);
			});

			await pm.pin(root);

			await promise;
		});
	});

	describe("getState", () => {
		it("returns the pins state", async () => {
			await Promise.all(
				[...(["DOWNLOADING", "COMPLETED", "DESTROYED", "UPLOADING"] as const).entries()].map(async ([i, state]) => {
					await components.pins.create({ cid: dag[i], state });
					const gotState = await pm.getState(dag[i]);

					assert.equal(gotState, state);
				})
			);
		});

		it("returns NOTFOUND if the pin doesn't exist", async () => {
			const root = dag[0];
			const state = await pm.getState(root);

			assert.equal(state, "NOTFOUND");
		});
	});

	describe("getActiveDownloads", () => {
		it("returns only the pins in the DOWNLOADING state", async () => {
			await Promise.all(
				[...(["DOWNLOADING", "COMPLETED", "DESTROYED", "UPLOADING"] as const).entries()].map(async ([i, state]) => {
					await components.pins.create({ cid: dag[i], state });
				})
			);

			const pins = await pm.getActiveDownloads();

			assert.equal(pins.length, 1);
			assert(pins[0].equals(dag[0]));
		});
	});

	describe("getHeads", () => {
		it("returns all the block downloads for a pin", async () => {
			await components.downloads.bulkCreate(dag.map(c => ({
				cid: c,
				pinnedBy: dag[0],
				depth: DAG_DEPTH
			})));

			const heads = await pm.getHeads(dag[0]);

			assert.equal(heads.length, dag.length);

			for (const head of heads) {
				assert(dag.map(d => d.toString()).includes(head.cid.toString()));
			}
		});

		it("returns no more than the limit", async () => {
			await components.downloads.bulkCreate(dag.map(c => ({
				cid: c,
				pinnedBy: dag[0],
				depth: DAG_DEPTH
			})));

			const limit = 2;
			const heads = await pm.getHeads(dag[0], { limit });

			assert.equal(heads.length, limit);
		});
	});

	describe("getSize", () => {
		it("returns the sum of the size of all the blocks under a pin", async () => {
			const sizePerBlock = 10;

			await components.blocks.bulkCreate(dag.map(c => ({
				cid: c,
				pinnedBy: dag[0],
				size: sizePerBlock,
				depth: 1
			})));

			const size = await pm.getSize(dag[0]);

			assert.equal(size, dag.length * sizePerBlock);
		});
	});

	describe("getBlockCount", () => {
		it("returns the number of blocks under a pin", async () => {
			await components.blocks.bulkCreate(dag.map(c => ({
				cid: c,
				pinnedBy: dag[0],
				size: 10,
				depth: 1
			})));

			const size = await pm.getBlockCount(dag[0]);

			assert.equal(size, dag.length);
		});
	});

	describe("downloadSync", () => {
		it("throws an error if the pin doesn't exist", async () => {
			assert.rejects(pm.downloadSync(dag[0]));
		});

		it("returns an empty array if it is in the COMPLETED state", async () => {
			await components.pins.create({
				cid: dag[0],
				state: "COMPLETED"
			});

			const downloaders = await pm.downloadSync(dag[0]);

			assert.equal(downloaders.length, 0);
		});

		it("returns all the downloaders for a pin", async () => {
			await components.pins.create({
				cid: dag[0],
				state: "DOWNLOADING"
			});

			await components.downloads.bulkCreate(dag.map(c => ({
				cid: c,
				pinnedBy: dag[0],
				size: 10,
				depth: 1
			})));

			const downloaders = await pm.downloadSync(dag[0]);

			assert.equal(downloaders.length, dag.length);

			await Promise.all(downloaders.map(async downloader => {
				const blockInfo = await downloader();

				assert(dag.map(d => d.toString()).includes(blockInfo.cid.toString()));
			}));
		});
	});

	describe("downloadPin", () => {
		it("throws an error if the pin doesn't exist", async () => {
			assert.rejects(all(pm.downloadPin(dag[0])));
		});

		it("returns an empty array if it is in the COMPLETED state", async () => {
			await components.pins.create({
				cid: dag[0],
				state: "COMPLETED"
			});

			const downloaders = await all(pm.downloadPin(dag[0]));

			assert.equal(downloaders.length, 0);
		});

		it("returns existing downloads for a pin first", async () => {
			await components.pins.create({
				cid: dag[0],
				state: "DOWNLOADING"
			});

			await components.downloads.create({
				cid: dag[0],
				pinnedBy: dag[0],
				depth: 1
			});

			const itr = pm.downloadPin(dag[0]);
			const downloader = await itr.next();

			assert(!downloader.done);

			await downloader.value();

			const blocks = await components.blocks.findAll();
			const downloads = await components.downloads.findAll();

			assert.equal(blocks.length, 1);
			assert.equal(downloads.length, DAG_WIDTH);
		});
	});
});
