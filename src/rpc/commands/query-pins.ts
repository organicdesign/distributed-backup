import type { Components } from "../../interface.js";

export const name = "query-pins";

export const method = ({ pins }: Components) => async (params: {}) => {
	const data = await pins.findAll({where: {}});

	return data;
};
