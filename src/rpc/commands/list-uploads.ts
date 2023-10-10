import type { Components } from "../../interface.js";

export const name = "list-uploads";

export const method = ({ localContent }: Components) => async () => {
	const items = await localContent.findAll();

	return items.map(i => i.cid.toString());
};
