import { del } from "../../sync/delete.js";
import { CID } from "multiformats/cid";
import type { Components } from "../../interface.js";

export const name = "delete";

export const method = (components: Components) => async (params: { cid: string, group: string }) => {
	const cid = await del(components, {
		group: CID.parse(params.group),
		cid: CID.parse(params.cid)
	});

	return cid.toString();
};
