import all from "it-all";
import type { Components } from "../utils.js";

export const name = "query-group";

export const method = (components: Components) => async (params: { group: string }) => {
	const group = components.groups.get(params.group);

	if (group == null) {
		throw new Error("no such group");
	}

	const data = await all(group.all());

	return data.map(d => d.key);
};
