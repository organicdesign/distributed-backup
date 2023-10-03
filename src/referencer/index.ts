import { sequelize } from "./sequelize";
import { Pins } from "./pins.js";
import { Blocks } from "./blocks.js";
import { Downloads } from "./downloads.js";
import { CID } from "multiformats/cid";
import type { Helia } from "@helia/interface";
import type { Blockstore } from "interface-blockstore";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { AbortOptions } from '@libp2p/interface'

const walkDag = async function * (blockstore: Blockstore, cid: CID, maxDepth: number, options: AbortOptions): AsyncGenerator<() => Promise<CID>> {
	const queue: Array<() => Promise<CID>> = [];
	const promises: Array<Promise<CID>> = [];

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

				return cid;
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

	async addLocal (cid: CID, path: string, depth: number)  {
		const [ pin ] = await Pins.findOrCreate({
			where: {
				cid: cid.toString()
			},

			defaults: {
				cid,
				path,
				state: "DOWNLOADING"
			}
		});

		// Load all the blocks into SQLite
		for await (const promise of walkDag(this.blockstore, cid, depth, {})) {
			const subCid = await promise();
			const block = await this.blockstore.get(subCid);

			await Blocks.findOrCreate({
				where: {
					cid: subCid.toString(),
					pinnedBy: cid.toString()
				},

				defaults: {
					cid: subCid,
					pinnedBy: cid,
					depth: depth,
					size: block.length
				}
			});
		}

		pin.state = "COMPLETED";

		await pin.save();
	}
}
