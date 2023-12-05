import { z } from "zod";
import { CID } from "multiformats/cid";
import { addLocal } from "../../sync/upload.js";
import { type Components, zCID, ImportOptions } from "../../interface.js";

export const name = "add";

const Params = ImportOptions.partial().extend(z.object({
	path: z.string(),
	group: zCID,
	localPath: z.string(),
	onlyHash: z.boolean().optional(),
	autoUpdate: z.boolean().optional(),
	versionCount: z.number().optional(),
	priority: z.number().optional()
}).shape);

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const cid = await addLocal(components, {
		group: CID.parse(params.group),
		encrypt: !!params.encrypt,
		localPath: params.localPath,
		path: params.path,
		hash: "sha2-256",
		chunker: "size-262144",
		rawLeaves: true,
		cidVersion: 1,
		nocopy: false,
		onlyHash: params.onlyHash,
		priority: params.priority ?? 1
	});

	return cid.toString();
};
