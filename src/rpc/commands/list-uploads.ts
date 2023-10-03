import type { Components } from "../../interface.js";

export const name = "list-uploads";

export const method = ({ uploads }: Components) => async () => {
	const items = await uploads.findAll();

	return items.map(i => i.cid.toString());
};
