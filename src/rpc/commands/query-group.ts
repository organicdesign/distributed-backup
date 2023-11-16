import { z } from "zod";
import { type Components, zCID } from "../../interface.js";

export const name = "query-group";

const Params = z.object({
	group: zCID
});

export const method = ({ remoteContent }: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);

	const data = await remoteContent.findAll({
		where: {
			group: params.group
		}
	});

	return data;
};
