import { z } from "zod";
import { type Components, zCID } from "../../interface.js";

export const name = "edit";

const Params = z.object({
	group: zCID,
	path: z.string(),
	priority: z.number()
});

export const method = (components: Components) => async (raw: unknown) => {
	throw new Error("not implemented");
	/*const params = Params.parse(raw);
	const rc = await components.content.findOne({ where: { group: params.group.toString(), path: params.path } });

	if (rc == null) {
		return;
	}

	if (params.priority != null) {
		rc.priority = params.priority;
	}

	await rc.save();

	return params.path;*/
};
