import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import { addBlockRef, addPinRef } from "./utils.js";
import { Event, EventTarget} from "ts-event-target";
import Queue from "p-queue";
import { DeferredPromise } from "@open-draft/deferred-promise";
import type { Blocks } from "./blocks.js";
import type { Pins } from "./pins.js";
import type { Downloads } from "./downloads.js";
import type { DAGWalker } from "../../node_modules/helia/dist/src/index.js";
import type { CID } from "multiformats/cid";
import type { Sequelize } from "sequelize";
import type { Helia } from "@helia/interface";

const getDagWalker = (cid: CID): DAGWalker => {
	const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

	if (dagWalker == null) {
		throw new Error(`No dag walker found for cid codec ${cid.code}`);
	}

	return dagWalker;
};

interface Components {
	helia: Helia
	sequelize: Sequelize
	pins: Pins
	downloads: Downloads
	blocks: Blocks
}

type EventTypes = "pins:removed" | "pins:added" | "pins:adding" | "downloads:added" | "downloads:removed" | "blocks:added" | "blocks:removed";

class CIDEvent extends Event<EventTypes> {
	cid: CID;

	constructor(type: EventTypes, cid: CID) {
		super(type);
		this.cid = cid;
	}
}

export class PinManager {
	readonly events = new EventTarget<[CIDEvent]>();
	private readonly components: Components;
	private readonly activeDownloads = new Map<string, Promise<{ block: Uint8Array, cid: CID, links: CID[] }>>();
	private readonly queue = new Queue({ concurrency: 1 });

	constructor (components: Components) {
		this.components = components;
	}

	async all () {
		return await this.components.pins.findAll({ where: {} });
	}

	async unpin (cid: CID) {
		const pin = await this.components.pins.findOne({ where: { cid: cid.toString() } });

		if (pin == null) {
			return;
		}

		pin.state = "DESTROYED";

		await pin.save();

		try {
			await this.components.helia.pins.rm(cid);
		} catch (error) {
			if ((error as Error)["code"] !== "ERR_NOT_FOUND") {
				throw error;
			}
		}

		await this.queue.add(() => this.components.sequelize.transaction(transaction => Promise.all([
			pin.destroy({ transaction }),
			this.components.downloads.destroy({ where: { pinnedBy: cid.toString() }, transaction }),
			this.components.blocks.destroy({ where: { pinnedBy: cid.toString() }, transaction })
		])));

		this.events.dispatchEvent(new CIDEvent("pins:removed", cid));
	}

	/**
	 * Pin a CID without downloading any blocks. This will throw an error if all the blocks don't exist locally.
	 */
	async pinLocal (cid: CID) {
		this.events.dispatchEvent(new CIDEvent("pins:adding", cid));

		const data = await this.queue.add(async () => await this.components.pins.findOrCreate({
			where: {
				cid: cid.toString()
			},

			defaults: {
				cid,
				state: "UPLOADING"
			}
		}));

		if (data == null) {
			throw new Error("pin find or create failed");
		}

		const [ pin ] = data;

		const walk = async (subCid: CID, depth: number) => {
			const dagWalker = getDagWalker(subCid);

			if (!await this.components.helia.blockstore.has(subCid)) {
				throw new Error("pin does not exist locally");
			}

			await addBlockRef(this.components.helia, subCid, cid);

			const block = await this.components.helia.blockstore.get(subCid);

			await this.queue.add(() => this.components.blocks.findOrCreate({
				where: {
					cid: subCid.toString(),
					pinnedBy: cid.toString()
				},

				defaults: {
					cid: subCid,
					pinnedBy: cid,
					size: block.length,
					depth
				}
			}));

			for await (const cid of dagWalker.walk(block)) {
				await walk(cid, depth + 1);
			}
		};

		await walk(cid, 0);

		await addPinRef(this.components.helia, cid);

		pin.state = "COMPLETED";

		await pin.save();

		this.events.dispatchEvent(new CIDEvent("pins:added", cid));
	}

	// Add a pin to the downloads.
	async pin (cid: CID) {
		const pin = await this.components.pins.findOne({
			where: {
				cid: cid.toString()
			}
		});

		if (pin != null) {
			return;
		}

		await this.queue.add(() => this.components.sequelize.transaction(transaction => Promise.all([
			this.components.pins.create({
				cid,
				state: "DOWNLOADING"
			}, { transaction }),

			this.components.downloads.create({
				cid,
				pinnedBy: cid,
				depth: 0
			}, { transaction })
		])));

		this.events.dispatchEvent(new CIDEvent("pins:adding", cid));
	}

	/**
	 * Get the current state of the pin.
	 */
	async getState (cid: CID): Promise<string> {
		const pin = await this.components.pins.findOne({ where: { cid: cid.toString() } });

		return pin == null ? "NOTFOUND" : pin.state;
	}

	// Get all the pins that are actively downloading.
	async getActiveDownloads (): Promise<CID[]> {
		const pins = await this.components.pins.findAll({ where: { state: "DOWNLOADING" } });

		return pins.map(p => p.cid);
	}

	/**
	 * Get all the download heads for a given pin.
	 */
	async getHeads (pin: CID, options?: Partial<{ limit: number }>) {
		const downloads = await this.components.downloads.findAll({
			where: { pinnedBy: pin.toString() },
			limit: options?.limit ?? undefined
		});

		return downloads;
	}

	/**
	 * Get the size on disk for a given pin.
	 */
	async getSize (pin: CID) {
		const blocks = await this.components.blocks.findAll({ where: { pinnedBy: pin.toString() } });

		return blocks.reduce((c, b) => b.size + c, 0);
	}

	async getBlockCount (pin: CID) {
		const { count } = await this.components.blocks.findAndCountAll({ where: { pinnedBy: pin.toString() } });

		return count;
	}

	/**
	 * Similar to `downloadPin` but only returns pins that are availible now.
	 */
	async downloadSync (pin: CID, options?: Partial<{ limit: number }>) {
		const pinData = await this.components.pins.findOne({ where: { cid: pin.toString() } });

		if (pinData == null) {
			throw new Error("no such pin");
		}

		if (pinData.state === "COMPLETED") {
			return [];
		}

		const heads = await this.getHeads(pin, options);

		// Filter the heads that are already downloading.
		return heads.filter(h => !this.activeDownloads.has(h.cid.toString())).map(h => async () => {
			const downloadResult = await this.download(h.cid);

			const heads = await this.getHeads(pin, { limit: 1 });

			if (heads.length === 0) {
				await addPinRef(this.components.helia, pin);

				const isCompleted = pinData.state === "COMPLETED";

				if (!isCompleted) {
					pinData.state = "COMPLETED";

					await pinData.save();

					this.events.dispatchEvent(new CIDEvent("pins:added", pin));
				}
			}

			return downloadResult;
		});
	}

	// Download an entire pin.
	async * downloadPin (pin: CID) {
		const pinData = await this.components.pins.findOne({ where: { cid: pin.toString() } });

		if (pinData == null) {
			throw new Error("no such pin");
		}

		if (pinData.state === "COMPLETED") {
			return;
		}

		const queue: Array<() => Promise<{ cid: CID, block: Uint8Array }>> = [];

		const enqueue = (cid: CID, depth: number): void => {
			queue.push(async () => {
				const { links, block } = await this.download(cid);

				if (pinData.depth == null || depth < pinData.depth) {
					for (const cid of links) {
						enqueue(cid, depth + 1);
					}
				}

				return { cid, block };
			});
		};

		const heads = await this.getHeads(pin);

		for (const head of heads) {
			enqueue(head.cid, head.depth);
		}

		const promises: Array<Promise<{ cid: CID, block: Uint8Array }>> = [];

		while (queue.length + promises.length !== 0) {
			const func = queue.shift();

			if (func == null) {
				await promises.shift();

				continue;
			}

			const promise = new DeferredPromise<{ cid: CID, block: Uint8Array }>();

			promises.push(promise);

			yield async () => {
				const value = await func();
				promise.resolve(value);

				return value;
			};
		}

		await addPinRef(this.components.helia, pin);

		pinData.state = "COMPLETED";

		await pinData.save();

		this.events.dispatchEvent(new CIDEvent("pins:added", pin));
	}

	// Download an individial block.
	private async download (cid: CID): Promise<{ block: Uint8Array, cid: CID, links: CID[] }> {
		// Check if we are already downloading this.
		const activePromise = this.activeDownloads.get(cid.toString());

		if (activePromise != null) {
			return activePromise;
		}

		const promise = (async () => {
			// Download the block and fetch the downloads referencing it.
			const [ downloads, block ] = await Promise.all([
				this.components.downloads.findAll({ where: { cid: cid.toString() } }),
				this.components.helia.blockstore.get(cid)
			]);

			for (const d of downloads) {
				await addBlockRef(this.components.helia, cid, d.pinnedBy);
			}

			// Save the blocks to the database.
			await Promise.all(downloads.map(d => this.queue.add(() => this.components.blocks.findOrCreate({
				where: {
					cid: cid.toString(),
					pinnedBy: d.pinnedBy.toString()
				},

				defaults: {
					cid,
					pinnedBy: d.pinnedBy,
					depth: d.depth,
					size: block.length
				}
			}))));

			// Add the next blocks to download.
			const dagWalker = getDagWalker(cid);
			const promises: Promise<unknown>[] = [];
			const links: CID[] = [];

			for await (const cid of dagWalker.walk(block)) {
				for (const d of downloads) {
					promises.push((async () => {
						const pin = await this.components.pins.findOne({ where: { cid: d.pinnedBy.toString() } });

						if (pin?.depth != null && pin.depth <= d.depth) {
							return;
						}

						links.push(cid);

						await this.queue.add(() => this.components.downloads.findOrCreate({
							where: {
								cid: cid.toString(),
								pinnedBy: d.pinnedBy.toString()
							},

							defaults: {
								cid,
								pinnedBy: d.pinnedBy,
								depth: d.depth + 1
							}
						}));
					})());
				}
			}

			await Promise.all(promises);

			// Delete the download references
			await Promise.all(downloads.map(d => d.destroy()));

			this.events.dispatchEvent(new CIDEvent("downloads:added", cid));

			return { block, cid, links };
		})();

		this.activeDownloads.set(cid.toString(), promise);

		const data = await promise;

		this.activeDownloads.delete(cid.toString());

		return data;
	}
}
