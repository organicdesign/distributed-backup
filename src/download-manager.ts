import * as downloader from "./downloader/multi.js";
import type { CID } from "multiformats";
import type { Helia } from "@helia/interface";

export class DownloadManager {
	private readonly active = new Map<string, AsyncGenerator<CID, unknown, number>>();
	private readonly downloader: AsyncGenerator<CID | undefined>;
	private readonly helia: Helia;

	constructor (helia: Helia) {
		this.helia = helia;
		this.downloader = this.createIterator();
	}

	add (cid: CID) {
		// @ts-ignore Downloader is makeshift and I don't care about return values right now.
		this.active.set(cid.toString(), downloader.add(this.helia, cid))
	}

	async download (): Promise<CID | undefined> {
		return (await this.downloader.next()).value;
	}

	private async * createIterator (): AsyncGenerator<CID | undefined> {
		for (;;) {
			if (this.active.size === 0) {
				yield;
				continue;
			}

			for (const [key, itr] of this.active.entries()) {
				const { value, done } = await itr.next();

				if (done) {
					this.active.delete(key);
				}

				yield value as CID;
			}
		}
	}
}
