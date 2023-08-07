import { Reference } from "../../database/index.js";
import type { Components } from "../../interface.js";

export const name = "query-group";

export const method = ({}: Components) => async (params: { group: string }) => {
	const data = await Reference.findAll({
		where: {
			group: params.group
		}
	});

	return data;
};
