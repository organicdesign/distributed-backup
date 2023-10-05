import { addLocal } from "../../sync/upload.js";
import { CID } from "multiformats/cid";
import type { Components, ImportOptions } from "../../interface.js";

export const name = "add";

export const method = (components: Components) => async (params: { path: string, group: string, onlyHash?: boolean, encrypt?: boolean, autoUpdate?: boolean } & ImportOptions) => {
	const cid = await addLocal(components, {
		group: CID.parse(params.group),
		encrypt: params.encrypt,
		path: params.path,
		hash: "sha2-256",
		chunker: "size-262144",
		rawLeaves: true,
		cidVersion: 1,
		nocopy: false,
		onlyHash: params.onlyHash,
		autoUpdate: params.autoUpdate
	});

	return cid.toString();
};
