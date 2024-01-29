import Path from "path";
import { z } from "zod";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { CID } from "multiformats/cid";
import { unixfs } from '@helia/unixfs';
import { decodeEntry, encodeEntry, getDagSize } from "../../utils.js";
import { type Components, type EncodedEntry, type Entry, zCID, DATA_KEY } from "../../interface.js";

export const name = "write";

const Params = z.object({
	group: zCID,
	path: z.string(),
	position: z.number().int().optional(),
	length: z.number().int().optional(),
	data: z.string()
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const group = components.groups.get(CID.parse(params.group));

	if (group == null) {
		throw new Error("no such group");
	}

	const key = Path.join(DATA_KEY, params.path);
	const encodedEntry = await group.store.selectors.get(group.store.index)(key) as EncodedEntry;

	const entry: Partial<Entry> = encodedEntry == null ? {} : decodeEntry(encodedEntry);
	const fs = unixfs(components.helia);
	const cid = await fs.addBytes(uint8ArrayFromString(params.data));
	const { blocks, size } = await getDagSize(components.blockstore, cid);

	const put = group.store.creators.put(key, encodeEntry({
		cid,
		author: components.libp2p.peerId.toCID(),
		encrypted: false,
		blocks,
		size,
		timestamp: Date.now(),
		priority: entry?.priority ?? 100,
		sequence: entry?.sequence ? entry.sequence + 1 : 0,
		revisionStrategy: entry.revisionStrategy ?? components.config.defaultRevisionStrategy
	}));

	await group.replica.write(put);
};
