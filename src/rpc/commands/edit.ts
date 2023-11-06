import type { Components, ImportOptions } from "../../interface.js";

export const name = "edit";

export const method = (components: Components) => async (params: { group: string, cid: string, priority?: number } & ImportOptions) => {
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
