import type { Components } from "../../interface.js";

export const name = "list-uploads";

export const method = (components: Components) => async () => {
	const items = await components.content.findAll();

	return items.map(i => i.cid.toString());
};
