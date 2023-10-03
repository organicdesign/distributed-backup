import type { Components } from "../../interface.js";

export const name = "add-to-group";

export const method = (components: Components) => async (params: { cid: string, group: string, replace?: string }) => {
	if (params.replace != null) {
		throw new Error("Replace is not implemented yet.");
	}

	return "not implemented";
};
