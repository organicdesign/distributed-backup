import { z } from "zod";
import { Address } from "welo";
import { type Components, zCID } from "../../interface.js";

export const name = "join-group";

const Params = z.object({
	group: zCID
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const manifest = await components.welo.fetch(Address.fromString(`/hldb/${params.group}`));

	await components.groups.add(manifest);

	return manifest.address.cid.toString();
};
