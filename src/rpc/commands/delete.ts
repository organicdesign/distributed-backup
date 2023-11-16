import { z } from "zod";
import { del } from "../../sync/delete.js";
import { CID } from "multiformats/cid";
import { zCID, type Components } from "../../interface.js";

export const name = "delete";

const Params = z.object({
	cid: zCID,
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const cid = await del(components, {
		group: CID.parse(params.group),
		cid: CID.parse(params.cid)
	});

	return cid.toString();
};
