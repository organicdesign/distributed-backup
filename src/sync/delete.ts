import * as logger from "../logger.js";
import type { CID } from "multiformats/cid";
import type { Components } from "../interface.js";

export const del = async (components: Components, params: { group: CID, path: string }): Promise<string> => {
	throw new Error("not implemented");
	/*
	const upload = await components.content.findOne({
		where: {
			path: params.path,
			group: params.group.toString()
		}
	});

	if (upload != null) {
		upload.state = "DESTROYED";

		await upload.save();

		logger.uploads(`[-] ${upload.path}`);
	}

	await components.groups.deleteFrom(params.path, params.group);

	return params.path;
	*/
};
