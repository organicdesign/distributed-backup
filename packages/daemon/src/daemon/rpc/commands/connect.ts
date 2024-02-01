import { z } from "zod";
import { multiaddr } from "@multiformats/multiaddr";
import { type Components, zMultiaddr } from "../../interface.js";

export const name = "connect";

const Params = z.object({
	address: zMultiaddr
});

export const method = (components: Components) => async (raw: unknown) => {
	const params = Params.parse(raw);
	const address = multiaddr(params.address);

	await components.libp2p.dial(address);
};
