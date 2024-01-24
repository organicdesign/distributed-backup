import Path from "path";
import { z } from "zod";
import { CID } from "multiformats/cid";
import * as dagCbor from "@ipld/dag-cbor";
import { countPeers } from "../../utils.js";
import * as logger from "../../logger.js";
import { decodeAny } from "../../utils.js";
import { VERSION_KEY, zCID, type Components, EncodedEntry } from "../../interface.js";
export const name = "revisions";

const Params = z.object({
	path: z.string(),
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const promises: Promise<{
		cid: string,
		peers: number,
		encrypted: boolean,
		peerId: string,
		sequence: number
	}>[] = [];

	const database = components.groups.get(CID.parse(params.group));

	if (database == null) {
		throw new Error("no such group");
	}

	const index = await database.store.latest();

	for await (const pair of index.query({ prefix: Path.join("/", VERSION_KEY, params.path)})) {
		if (decodeAny(pair.value) == null) {
			logger.warn("ignoring null value")
			continue;
		}

		const entry = EncodedEntry.optional().parse(dagCbor.decode(pair.value));

		if (entry == null) {
			continue;
		}

		const item = CID.decode(entry.cid);

		const keyParts = pair.key.toString().split("/");
		const sequence = keyParts.pop();
		const peerId = keyParts.pop();

		if (sequence == null || peerId == null) {
			throw new Error("corrupted database");
		}

		promises.push((async () => {
			return {
				cid: item.toString(),
				peers: await countPeers(components, item, { timeout: 3000 }),
				encrypted: entry.encrypted,
				peerId,
				sequence: +sequence
			};
		})());
	}

	return await Promise.all(promises);
};
