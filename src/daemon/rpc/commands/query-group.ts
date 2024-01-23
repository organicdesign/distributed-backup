import { z } from "zod";
import { CID } from "multiformats/cid";
import all from "it-all";
import { type Components, zCID, EncodedEntry } from "../../interface.js";

export const name = "query-group";

const Params = z.object({
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const group = components.groups.get(CID.parse(params.group));

	if (group == null) {
		throw new Error("no such group");
	}

	const values = await all(group.store.selectors.values(group.store.index)());

	return values.map(value => EncodedEntry.parse(value));
};
