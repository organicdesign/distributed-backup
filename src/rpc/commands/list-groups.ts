import all from "it-all";
import type { Components } from "../utils.js";

export const name = "list-groups";

export const method = (components: Components) => async () => {
	const groups = await all(components.groups.list());

	return groups;
};
