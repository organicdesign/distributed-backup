import { z } from "zod";
import { CID } from "multiformats/cid";
import { type Components, zCID } from "../../interface.js";

export const name = "edit";

const Params = z.object({
	group: zCID,
	path: z.string(),
	priority: z.number()
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	await components.references.set(CID.parse(params.group), params.path, { priority: params.priority });

	return params.path;
};
