import { z } from "zod";
import { exportFs } from "../../fs-exporter/index.js";
import { CID } from "multiformats/cid";
import all from "it-all";
import { type Components, zCID } from "../../interface.js";

export const name = "export";

const Params = z.object({
	path: z.string(),
	cid: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const pair = await all(components.stores.get("reverse-lookup").query({ prefix: params.cid }));

	if (pair.length === 0) {
		throw new Error("Could not find CID");
	}

	const cid = CID.parse(params.cid);

	await exportFs(components, cid, params.path);
};
