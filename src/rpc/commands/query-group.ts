import type { Components } from "../../interface.js";

export const name = "query-group";

export const method = ({ references }: Components) => async (params: { group: string }) => {
	const data = await references.findAll({
		where: {
			group: params.group
		}
	});

	return data;
};
