import type { CID } from "multiformats/cid";
import type { Components } from "../interface.js";

export const del = async (components: Components, params: { group: CID, path: string }): Promise<string> => {
	await components.uploads.add("delete", [ params.group.bytes, params.path ]);

	return params.path;
};
