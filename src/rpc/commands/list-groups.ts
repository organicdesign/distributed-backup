import type { Components } from "../utils.js";

export const name = "list-groups";

export const method = (components: Components) => async () => {
	const groups = [...components.groups.list()];

	return groups;
};
