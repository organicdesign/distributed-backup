import { Address } from "../../../../welo/dist/src/index.js";
import type { Components } from "../../interface.js";

export const name = "join-group";

export const method = (components: Components) => async (params: { group: string }) => {
	const manifest = await components.welo.fetch(Address.fromString(`/hldb/${params.group}`));

	await components.groups.add(manifest);

	return manifest.address.cid.toString();
};
