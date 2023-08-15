import { References } from "../../database/index.js";
import type { Components } from "../../interface.js";

export const name = "query-group";

export const method = ({}: Components) => async (params: { group: string }) => {
	const data = await References.findAll({
		where: {
			group: params.group
		}
	});

	return data;
};
