import type { Components } from "../../interface.js";

export const name = "list-groups";

export const method = (components: Components) => async () => {
	const groups = [...components.groups.all()].map(p => p.key);

	return groups;
};
