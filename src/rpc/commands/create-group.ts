import { createGroup } from "../../database/utils.js";
import { GroupDatabase } from "../../database/group-database.js";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import type { Components } from "../utils.js";

export const name = "create-group";

export const method = (components: Components) => async (params: { name: string, peers: string[] }) => {
	const peerValues = params.peers.map(p => uint8ArrayFromString(p, "base64"));
	const database = await createGroup(components.welo, params.name, peerValues);
	const group = new GroupDatabase(database);

	throw new Error("not implemented");
};
