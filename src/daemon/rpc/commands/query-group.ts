import Path from "path";
import { z } from "zod";
import { CID } from "multiformats/cid";
import all from "it-all";
import * as dagCbor from "@ipld/dag-cbor";
import { decodeEntry } from "../../utils.js";
import { type Components, zCID, EncodedEntry, DATA_KEY } from "../../interface.js";

export const name = "query-group";

const Params = z.object({
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const database = components.groups.get(CID.parse(params.group));

	if (database == null) {
		throw new Error("no such group");
	}

	const index = await database.store.latest();
	const values = await all(index.query({ prefix: Path.join("/", DATA_KEY)}));

	return values
		.map(pair => ({ ...pair, value: dagCbor.decode(pair.value) }))
		.map(pair => ({ ...pair, value: decodeEntry(EncodedEntry.parse(pair.value)) }))
		.map(pair => ({
		...pair.value,
		cid: pair.value.cid.toString(),
		author: pair.value.author.toString(),
		path: pair.key.toString()
	}));
};
