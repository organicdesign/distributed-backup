import Path from "path";
import { z } from "zod";
import { exportFs } from "../../fs-exporter/index.js";
import { CID } from "multiformats/cid";
import { decodeEntry } from "../../utils.js";
import { DATA_KEY } from "../../interface.js"
import { type Components, type EncodedEntry, zCID } from "../../interface.js";

export const name = "export";

const Params = z.object({
	path: z.string(),
	outPath: z.string(),
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const group = components.groups.get(CID.parse(params.group));

	if (group == null) {
		throw new Error("no such group");
	}

	const encodedEntry = await group.store.selectors.get(group.store.index)(Path.join(DATA_KEY, params.path)) as EncodedEntry;

	if (encodedEntry == null) {
		throw new Error("no such item");
	}

	const entry = decodeEntry(encodedEntry);

	await exportFs(components, entry.cid, params.outPath);
};
