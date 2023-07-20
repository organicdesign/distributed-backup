import { createGroup } from "../../database/utils.js";
import { fromString as uint8ArrayFromString } from "uint8arrays";
import type { Components } from "../utils.js";

export const name = "create-group";

export const method = (components: Components) => async (params: { name: string, peers: string[] }) => {
	const peerValues = params.peers.map(p => uint8ArrayFromString(p, "base64"));

	const manifest = await components.welo.determine({
		name,
		meta: { type: "group" },
		access: {
			protocol: "/hldb/access/static",
			config: { write: peerValues }
		}
	});

	await components.groups.add(manifest);

	return manifest.address;
};