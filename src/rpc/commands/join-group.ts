import { Address } from "../../../../welo/dist/src/index.js";
import type { Components } from "../utils.js";

export const name = "join-group";

export const method = (components: Components) => async (params: { address: string }) => {
	const manifest = await components.welo.fetch(Address.fromString(params.address));

	await components.groups.add(manifest);

	return manifest.address;
};
