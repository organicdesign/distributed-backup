import type { Components } from "../../interface.js";

export const name = "list-groups";

export const method = (components: Components) => async () => {
	const groups = [...components.groups.list()];

	return groups;
};
