import { joinGroup } from "../../database/utils.js";
import { GroupDatabase } from "../../database/group-database.js";
import type { Components } from "../utils.js";

export const name = "join";

export const method = (components: Components) => async (params: { address: string }) => {
	const database = await joinGroup(components.welo, params.address);
	const group = new GroupDatabase(database);

	throw new Error("not implemented");
};
