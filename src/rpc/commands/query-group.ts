import all from "it-all";
import { CID } from "multiformats/cid";
import type { Components } from "../../interface.js";

export const name = "query-group";

export const method = ({ references }: Components) => async (params: { group: string }) => {
	const data = await all(references.allByGroup(CID.parse(params.group)));

	return data;
};
