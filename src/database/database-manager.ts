import { sequelize, Pins, Downloads, Blocks } from "./index.js";
import { base36 } from "multiformats/bases/base36";
import * as cborg from "cborg";
import { Key } from "interface-datastore";
import { equals as uint8ArrayEquals } from "uint8arrays/equals";
import * as dagWalkers from "../../node_modules/helia/dist/src/utils/dag-walkers.js";
import type { CID } from "multiformats/cid";
import type { Helia } from "@helia/interface";

const DATASTORE_PIN_PREFIX = "/pin/";
const DATASTORE_BLOCK_PREFIX = "/pinned-block/";
const DATASTORE_ENCODING = base36;

interface DatastorePinnedBlock {
	pinCount: number
	pinnedBy: Uint8Array[]
}

export class DatabaseManager {
	private readonly helia: Helia;
	private readonly activeDownloads = new Map<string, Promise<void>>();

	constructor ({ helia }: { helia: Helia }) {
		this.helia = helia;
	}

	async pin (cid: CID) {
		await sequelize.transaction(transaction => Promise.all([
			Pins.create({
				cid,
				completed: false,
				depth: -1
			}, { transaction }),

			Downloads.create({
				cid,
				pinnedBy: cid,
				depth: 0
			}, { transaction })
		]));
	}

	/**
	 * Get all the download heads for a given pin.
	 */
	async getHeads (pin: CID) {
		const downloads = await Downloads.findAll({ where: { pinnedBy: pin.toString() } });

		return downloads.map(d => d.cid);
	}

	/**
	 * Get the size on disk for a given pin.
	 */
	async getSize (pin: CID) {
		const blocks = await Blocks.findAll({ where: { pinnedBy: pin.toString() } });

		return blocks.reduce((c, b) => b.size + c, 0);
	}

	async download (cid: CID) {
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
					return;
				}

				pinnedBlock.pinCount++;
				pinnedBlock.pinnedBy.push(d.pinnedBy.bytes);
			}

			await this.helia.datastore.put(blockKey, cborg.encode(pinnedBlock));

			// Add the next blocks to download.
			const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code);

			if (dagWalker == null) {
				throw new Error(`No dag walker found for cid codec ${cid.code}`);
			}

			const promises: Promise<unknown>[] = [];

			for await (const cid of dagWalker.walk(block)) {
				for (const d of downloads) {
					promises.push(Downloads.create({
						cid,
						pinnedBy: d.pinnedBy,
						depth: d.depth + 1
					}));
				}
			}

			await Promise.all(promises);

			// Delete the download references
			await Promise.all(downloads.map(d => d.destroy()));
		})();

		this.activeDownloads.set(cid.toString(), promise);

		await promise;

		this.activeDownloads.delete(cid.toString());
	}
}
