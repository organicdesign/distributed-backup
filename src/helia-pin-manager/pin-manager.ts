import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import { addBlockRef, addPinRef } from "./utils.js";
import type { Blocks } from "./blocks.js";
import type { Pins } from "./pins.js";
import type { Downloads } from "./downloads.js";
import type { DAGWalker } from "../../node_modules/helia/dist/src/index.js";
import type { CID } from "multiformats/cid";
import type { Transaction, Sequelize } from "sequelize";
import type { Helia } from "@helia/interface";
import { Event, EventTarget} from 'ts-event-target';

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

	constructor (components: Components) {
		this.components = components;
	}

	async all () {
		return await this.components.pins.findAll({ where: {} });
	}

	async unpin (cid: CID) {
		if (await this.components.helia.pins.isPinned(cid)) {
			await this.components.helia.pins.rm(cid);
		}

		await this.components.sequelize.transaction(transaction => Promise.all([
			this.components.pins.destroy({ where: { cid: cid.toString() }, transaction }),
			this.components.downloads.destroy({ where: { pinnedBy: cid.toString() }, transaction }),
			this.components.blocks.destroy({ where: { pinnedBy: cid.toString() }, transaction })
		]));

		this.events.dispatchEvent(new CIDEvent("pins:removed", cid));
	}

	// Add a pin to the downloads.
	async pin (cid: CID, options?: Partial<{ transaction: Transaction }>) {
		const pin = await this.components.pins.findOne({
			where: {
				cid: cid.toString()
			}
		});

		if (pin != null) {
			return;
		}

		const action = (transaction: Transaction) => Promise.all([
			this.components.pins.create({
				cid,
				state: "DOWNLOADING"
			}, { transaction }),

			this.components.downloads.create({
				cid,
				pinnedBy: cid,
				depth: 0
			}, { transaction })
		]);

		if (options?.transaction) {
			await action(options.transaction);
		} else {
			await this.components.sequelize.transaction(action);
		}

		this.events.dispatchEvent(new CIDEvent("pins:adding", cid));
	}

	/**
	 * Get the current state of the pin.
	 */
	async getState (cid: CID): Promise<string> {
		const pin = await this.components.pins.findOne({ where: { cid: cid.toString() } });

		return pin == null ? "DESTROYED" : pin.state;
	}

	// Get all the pins that are actively downloading.
	async getActiveDownloads (): Promise<CID[]> {
		const pins = await this.components.pins.findAll({ where: { state: "DOWNLOADING" } });

		return pins.map(p => p.cid);
	}

	/**
	 * Get all the download heads for a given pin.
	 */
	async getHeads (pin: CID) {
		const downloads = await this.components.downloads.findAll({ where: { pinnedBy: pin.toString() } });

		return downloads;
	}

	/**
	 * Get the size on disk for a given pin.
	 */
	async getSize (pin: CID) {
		const blocks = await this.components.blocks.findAll({ where: { pinnedBy: pin.toString() } });

		return blocks.reduce((c, b) => b.size + c, 0);
	}

	// Download an entire pin.
	async * downloadPin (pin: CID) {
		const pinData = await this.components.pins.findOne({ where: { cid: pin.toString() } });

		if (pinData == null) {
			throw new Error("no such pin");
		}

		const queue: Array<() => Promise<CID>> = [];
		const promises: Array<Promise<CID>> = [];

		const enqueue = (cid: CID, depth: number): void => {
			queue.push(async () => {
				const promise = (async () => {
					const { links } = await this.download(cid);

					if (pinData.depth == null || depth < pinData.depth) {
						for (const cid of links) {
							enqueue(cid, depth + 1);
						}
					}

					return cid;
				})();

				promises.push(promise);

				return promise;
			});
		};

		const heads = await this.getHeads(pin);

		for (const head of heads) {
			enqueue(head.cid, head.depth);
		}

		while (queue.length + promises.length !== 0) {
			const func = queue.shift();

			if (func == null) {
				await promises.shift();

				continue;
			}

			yield func;
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
			await Promise.all(downloads.map(d => this.components.blocks.create({
				cid,
				pinnedBy: d.pinnedBy,
				depth: d.depth,
				size: block.length
			})));

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

						const download = await this.components.downloads.findOne({
							where: {
								cid: cid.toString(),
								pinnedBy: d.pinnedBy.toString()
							}
						});

						if (download == null) {
							await this.components.downloads.create({
								cid,
								pinnedBy: d.pinnedBy,
								depth: d.depth + 1
							});
						}
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
