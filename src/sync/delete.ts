import * as logger from "../logger.js";
import type { CID } from "multiformats/cid";
import type { Components } from "../interface.js";

export const del = async (components: Components, params: { group: CID, cid: CID }): Promise<CID> => {
	const { localContent, groups } = components;

	const upload = await localContent.findOne({
		where: {
			cid: params.cid.toString(),
			group: params.group.toString()
		}
	});

	if (upload != null) {
		upload.state = "DESTROYED";

		await upload.save();

		logger.uploads(`[-] ${upload.path}`);
	}

	await groups.deleteFrom(params.cid, params.group);

	return params.cid;
};
