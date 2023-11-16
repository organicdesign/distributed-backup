import { z } from "zod";
import { type Components, zCID } from "../../interface.js";

export const name = "edit";

const Params = z.object({
	group: zCID,
	cid: zCID,
	priority: z.number()
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const rc = await components.remoteContent.findOne({ where: { group: params.group.toString(), cid: params.cid.toString() } });

	if (rc == null) {
		return;
	}

	if (params.priority != null) {
		rc.priority = params.priority;
	}

	await rc.save();

	return params.cid.toString();
};
