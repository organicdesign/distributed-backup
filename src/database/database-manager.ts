import { sequelize, Pins, Downloads, Blocks } from "./index.js";
import { base36 } from "multiformats/bases/base36";
import * as cborg from "cborg";
import { Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays/equals";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { DAGWalker } from "../../node_modules/helia/dist/src/index.js";
import type { CID } from "multiformats/cid";
import type { Helia } from "@helia/interface";
import type { Transaction } from "sequelize";

const DATASTORE_PIN_PREFIX = "/pin/";
const DATASTORE_BLOCK_PREFIX = "/pinned-block/";
const DATASTORE_ENCODING = base36;

const getDagWalker = (cid: CID): DAGWalker => {
	const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

	if (dagWalker == null) {
		throw new Error(`No dag walker found for cid codec ${cid.code}`);
	}

	return dagWalker;
};

interface DatastorePinnedBlock {
	pinCount: number
	pinnedBy: Uint8Array[]
}

enum PinState {
	UNPINNED,
	PINNED,
	PENDING
}

export class DatabaseManager {
	private readonly helia: Helia;
	private readonly activeDownloads = new Map<string, Promise<{ block: Uint8Array, cid: CID, links: CID[] }>>();

	constructor ({ helia }: { helia: Helia }) {
		this.helia = helia;
	}

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
				completed: false,
				depth: Infinity
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
			await sequelize.transaction(action)
		}
	}

	/**
	 * Get the current state of the pin.
	 */
	async getState (cid: CID): Promise<PinState> {
		const pin = await Pins.findOne({ where: { cid: cid.toString() } });

		if (pin == null) {
			return PinState.UNPINNED;
		}

		return pin.completed ? PinState.PINNED : PinState.PENDING;
	}

	async getActiveDownloads (): Promise<CID[]> {
		const pins = await Pins.findAll({ where: { completed: false } });

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
			})
		}

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
	}

	async download (cid: CID): Promise<{ block: Uint8Array, cid: CID, links: CID[] }> {
		// Check if we are already downloading this.
		const activePromise = this.activeDownloads.get(cid.toString());

		if (activePromise != null) {
			return activePromise;
		}

		const promise = (async () => {
			// Download the block and fetch the downloads referencing it.
			const [ downloads, block ] = await Promise.all([
				Downloads.findAll({ where: { cid: cid.toString() } }),
				this.helia.blockstore.get(cid)
			]);

			// Save the blocks to the database.
			await Promise.all(downloads.map(d => Blocks.create({
				cid,
				pinnedBy: d.pinnedBy,
				depth: d.depth,
				size: block.length
			})));

			// Register those blocks as pinned by helia.
			const blockKey = new Key(`${DATASTORE_BLOCK_PREFIX}${DATASTORE_ENCODING.encode(cid.multihash.bytes)}`);

			let pinnedBlock: DatastorePinnedBlock = {
				pinCount: 0,
				pinnedBy: []
			};

			try {
				pinnedBlock = cborg.decode(await this.helia.datastore.get(blockKey));
			} catch (err: any) {
				if (err.code !== 'ERR_NOT_FOUND') {
					throw err;
				}
			}

			for (const d of downloads) {
				if (pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, cid.bytes)) != null) {
					continue;
				}

				pinnedBlock.pinCount++;
				pinnedBlock.pinnedBy.push(d.pinnedBy.bytes);
			}

			await this.helia.datastore.put(blockKey, cborg.encode(pinnedBlock));

			// Add the next blocks to download.
			const dagWalker = getDagWalker(cid);
			const promises: Promise<unknown>[] = [];
			const links: CID[] = [];

			for await (const cid of dagWalker.walk(block)) {
				for (const d of downloads) {
					promises.push((async () => {
						const pin = await Pins.findOne({ where: { cid: d.pinnedBy.toString() } });

						if (pin?.depth == null || pin.depth <= d.depth) {
							return;
						}

						links.push(cid);

						await Downloads.create({
							cid,
							pinnedBy: d.pinnedBy,
							depth: d.depth + 1
						})
					})());
				}
			}

			await Promise.all(promises);

			// Delete the download references
			await Promise.all(downloads.map(d => d.destroy()));

			return { block, cid, links };
		})();

		this.activeDownloads.set(cid.toString(), promise);

		const data = await promise;

		this.activeDownloads.delete(cid.toString());

		return data;
	}
}
