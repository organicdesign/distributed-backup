import Path from "path";
import { z } from "zod";
import { CID } from "multiformats/cid";
import all from "it-all";
import * as dagCbor from "@ipld/dag-cbor";
import { Key } from "interface-datastore";
import { type Components, zCID, Pair } from "../../interface.js";

export const name = "query-group-dirs";

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
	const values = await all(index.query({ prefix: "/d" }));

	const filteredValues = values
		.map(pair => ({ ...pair, value: dagCbor.decode(pair.value) }))
		.filter(pair => !!pair.value) as Pair<Key, { timestamp: number }>[]

	const r = filteredValues
		.map(pair => ({
			...pair.value,
			path: pair.key.toString()
		}));

	return r;
};
