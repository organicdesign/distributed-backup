import type { Components } from "../../interface.js";

export const name = "query-group";

export const method = ({ remoteContent }: Components) => async (params: { group: string }) => {
	const data = await remoteContent.findAll({
		where: {
			group: params.group
		}
	});

	return data;
};
