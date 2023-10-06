import { sequelize, Pins, Downloads, Blocks } from "./database/index.js";
import * as dagWalkers from "../node_modules/helia/dist/src/utils/dag-walkers.js";
import { addBlockRef, addPinRef } from "./utils.js";
import * as logger from "./logger.js";
import type { DAGWalker } from "../node_modules/helia/dist/src/index.js";
import type { Components } from "./interface.js";
import type { CID } from "multiformats/cid";
import type { Transaction } from "sequelize";

const getDagWalker = (cid: CID): DAGWalker => {
	const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

	if (dagWalker == null) {
		throw new Error(`No dag walker found for cid codec ${cid.code}`);
	}

	return dagWalker;
};

export class DownloadManager {
	private readonly components: Components;
	private readonly activeDownloads = new Map<string, Promise<{ block: Uint8Array, cid: CID, links: CID[] }>>();

	constructor (components: Components) {
		this.components = components;
	}

	async unpin (cid: CID) {
		if (await this.components.helia.pins.isPinned(cid)) {
			await this.components.helia.pins.rm(cid);
		}

		await sequelize.transaction(transaction => Promise.all([
			Pins.destroy({ where: { cid: cid.toString() }, transaction }),
			Downloads.destroy({ where: { pinnedBy: cid.toString() }, transaction }),
			Blocks.destroy({ where: { pinnedBy: cid.toString() }, transaction })
		]));

		logger.pins(`[-] ${cid}`);
	}

	// Add a pin to the downloads.
	async pin (cid: CID, options?: Partial<{ transaction: Transaction }>) {
		const pin = await Pins.findOne({
			where: {
				cid: cid.toString()
			}
		});

		if (pin != null) {
			return;
		}

		const action = (transaction: Transaction) => Promise.all([
			Pins.create({
				cid,
				state: "DOWNLOADING"
			}, { transaction }),

			Downloads.create({
				cid,
				pinnedBy: cid,
				depth: 0
			}, { transaction })
		]);

		if (options?.transaction) {
			await action(options.transaction);
		} else {
			await sequelize.transaction(action);
		}

		logger.pins(`[~] ${cid}`);
	}

	/**
	 * Get the current state of the pin.
	 */
	async getState (cid: CID): Promise<string> {
		const pin = await Pins.findOne({ where: { cid: cid.toString() } });

		return pin == null ? "DESTROYED" : pin.state;
	}

	// Get all the pins that are actively downloading.
	async getActiveDownloads (): Promise<CID[]> {
		const pins = await Pins.findAll({ where: { state: "DOWNLOADING" } });

		return pins.map(p => p.cid);
	}

	/**
	 * Get all the download heads for a given pin.
	 */
	async getHeads (pin: CID) {
		const downloads = await Downloads.findAll({ where: { pinnedBy: pin.toString() } });

		return downloads;
	}

	/**
	 * Get the size on disk for a given pin.
	 */
	async getSize (pin: CID) {
		const blocks = await Blocks.findAll({ where: { pinnedBy: pin.toString() } });

		return blocks.reduce((c, b) => b.size + c, 0);
	}

	// Download an entire pin.
	async * downloadPin (pin: CID) {
		const pinData = await Pins.findOne({ where: { cid: pin.toString() } });

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
		logger.pins(`[+] ${pin}`);
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
				Downloads.findAll({ where: { cid: cid.toString() } }),
				this.components.helia.blockstore.get(cid)
			]);

			for (const d of downloads) {
				await addBlockRef(this.components.helia, cid, d.pinnedBy);
			}

			// Save the blocks to the database.
			await Promise.all(downloads.map(d => Blocks.create({
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
						const pin = await Pins.findOne({ where: { cid: d.pinnedBy.toString() } });

						if (pin?.depth != null && pin.depth <= d.depth) {
							return;
						}

						links.push(cid);

						const download = await Downloads.findOne({
							where: {
								cid: cid.toString(),
								pinnedBy: d.pinnedBy.toString()
							}
						});

						if (download == null) {
							await Downloads.create({
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

			logger.downloads(`[+] ${cid}`);

			return { block, cid, links };
		})();

		this.activeDownloads.set(cid.toString(), promise);

		const data = await promise;

		this.activeDownloads.delete(cid.toString());

		return data;
	}
}
