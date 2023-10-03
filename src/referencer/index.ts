import { sequelize } from "./sequelize";
import { Pins } from "./pins.js";
import { Blocks } from "./blocks.js";
import { Downloads } from "./downloads.js";
import { References } from "./references.js";
import { CID } from "multiformats/cid";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { AbortOptions } from "@libp2p/interface";
import type { Blockstore } from "interface-blockstore";

const walkDag = async function * (blockstore: Blockstore, cid: CID, maxDepth: number, options: AbortOptions): AsyncGenerator<() => Promise<{ cid: CID, depth: number }>> {
	const queue: Array<() => Promise<{ cid: CID, depth: number }>> = [];
	const promises: Array<Promise<{ cid: CID, depth: number }>> = [];

	const enqueue = (cid: CID, depth: number): void => {
		queue.push(async () => {
			const promise = Promise.resolve().then(async () => {
				const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

				if (dagWalker == null) {
					throw new Error(`No dag walker found for cid codec ${cid.code}`);
				}

				const block = await blockstore.get(cid, options);

				if (depth < maxDepth) {
					for await (const cid of dagWalker.walk(block)) {
						enqueue(cid, depth + 1);
					}
				}

				return { cid, depth };
			});

			promises.push(promise);

			return promise;
		});
	}

	enqueue(cid, 0);

	while (queue.length + promises.length !== 0) {
		const func = queue.shift();

		if (func == null) {
			await promises.shift();

			continue;
		}

		yield func;
	}
};

export class Referencer {
	private readonly blockstore: Blockstore;

	constructor ({ blockstore }: { blockstore: Blockstore }) {
		this.blockstore = blockstore;
	}

	async start () {
		await sequelize.sync();
	}

	async addFromGroup (cid: CID, group: string, depth?: number) {
		// Create the reference
		await sequelize.transaction(async transaction => {
			return await Promise.all([
				Pins.findOrCreate({
					where: {
						cid: cid.toString()
					},

					defaults: {
						cid,
						state: "DOWNLOADING",
						depth
					},

					transaction
				}),

				References.findOrCreate({
					where: {
						cid: cid.toString(),
						reference: group
					},

					defaults: {
						cid,
						reference: group,
						type: "REMOTE",
						meta: {}
					},

					transaction
				})
			]);
		});

		await Downloads.findOrCreate({
			where: {
				cid: cid.toString(),
				pinnedBy: cid.toString()
			},

			defaults: {
				cid,
				pinnedBy: cid,
				depth: 0
			}
		});
	}

	async addLocal (cid: CID, path: string, depth?: number)  {
		const [ [ pin ] ] = await sequelize.transaction(async transaction => {
			return await Promise.all([
				Pins.findOrCreate({
					where: {
						cid: cid.toString()
					},

					defaults: {
						cid,
						state: "DOWNLOADING",
						depth
					},

					transaction
				}),

				References.findOrCreate({
					where: {
						cid: cid.toString(),
						reference: path
					},

					defaults: {
						cid,
						reference: path,
						type: "LOCAL",
						meta: {}
					},

					transaction
				})
			]);
		});

		// Load all the blocks into SQLite
		for await (const promise of walkDag(this.blockstore, cid, depth ?? Infinity, {})) {
			const item = await promise();
			const block = await this.blockstore.get(item.cid);

			await Blocks.findOrCreate({
				where: {
					cid: item.cid.toString(),
					pinnedBy: cid.toString()
				},

				defaults: {
					cid: item.cid,
					pinnedBy: cid,
					depth: item.depth,
					size: block.length
				}
			});
		}

		pin.state = "COMPLETED";

		await pin.save();
	}
}
