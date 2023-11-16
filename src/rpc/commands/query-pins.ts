import type { Components } from "../../interface.js";

export const name = "query-pins";

export const method = ({ pinManager }: Components) => async () => {
	const data = await pinManager.all();

	return data;
};
